import fs from "node:fs";
import path from "node:path";
import xcode from "xcode";

const repoRoot = process.cwd();
const projectPath = path.join(repoRoot, "ios/App/App.xcodeproj/project.pbxproj");

function parseProject(project) {
  return new Promise((resolve, reject) => {
    project.parse((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function stripQuotes(value) {
  return typeof value === "string" ? value.replace(/^"(.*)"$/, "$1") : value;
}

function ensureSection(project, name) {
  const objects = project.hash.project.objects;
  if (!objects[name]) {
    objects[name] = {};
  }

  return objects[name];
}

function findTargetKey(project, name) {
  const targets = project.pbxNativeTargetSection();

  for (const [key, value] of Object.entries(targets)) {
    if (key.endsWith("_comment") || typeof value !== "object") {
      continue;
    }

    if (stripQuotes(value.name) === name) {
      return key;
    }
  }

  return null;
}

function findFileReference(project, candidates) {
  const fileReferenceSection = project.pbxFileReferenceSection();
  const wantedPaths = Array.isArray(candidates) ? candidates : [candidates];

  for (const wantedPath of wantedPaths) {
    for (const [key, value] of Object.entries(fileReferenceSection)) {
      if (key.endsWith("_comment") || typeof value !== "object") {
        continue;
      }

      if (stripQuotes(value.path) === wantedPath) {
        return {
          basename: stripQuotes(fileReferenceSection[`${key}_comment`] ?? path.basename(stripQuotes(value.path))),
          fileRef: key,
        };
      }
    }
  }

  return null;
}

function ensureGroup(project, parentKey, name, groupPath = name) {
  const existingKey = project.findPBXGroupKey({ name, path: groupPath });
  if (existingKey) {
    return existingKey;
  }

  const group = project.addPbxGroup([], name, groupPath);
  project.addToPbxGroup(group.uuid, parentKey);
  return group.uuid;
}

function findFileReferenceInGroup(project, groupKey, desiredPath) {
  const group = project.getPBXGroupByKey(groupKey);

  for (const child of group.children) {
    const fileRef = project.pbxFileReferenceSection()[child.value];
    if (fileRef && stripQuotes(fileRef.path) === desiredPath) {
      return {
        basename: stripQuotes(project.pbxFileReferenceSection()[`${child.value}_comment`] ?? path.basename(desiredPath)),
        fileRef: child.value,
      };
    }
  }

  return null;
}

function findGroupKey(project, { name, path: groupPath }) {
  const groups = project.hash.project.objects.PBXGroup;

  for (const [key, value] of Object.entries(groups)) {
    if (key.endsWith("_comment") || typeof value !== "object") {
      continue;
    }

    if (groupPath && stripQuotes(value.path) !== groupPath) {
      continue;
    }

    if (name && value.name && stripQuotes(value.name) !== name) {
      continue;
    }

    if (name && !value.name && stripQuotes(value.path) !== name && groupPath == null) {
      continue;
    }

    return key;
  }

  return null;
}

function ensureFileInGroup(project, groupKey, options) {
  const {
    desiredPath,
    legacyPaths = [],
    sourceTree = '"<group>"',
    lastKnownFileType,
    explicitFileType,
  } = options;
  const legacyMatch = legacyPaths.length > 0 ? findFileReference(project, legacyPaths) : null;
  const groupMatch = findFileReferenceInGroup(project, groupKey, desiredPath);
  const desiredMatch = legacyPaths.length === 0 ? findFileReference(project, desiredPath) : null;
  const match = legacyMatch ?? groupMatch ?? desiredMatch;
  const group = project.getPBXGroupByKey(groupKey);
  let file = match;

  if (!file) {
    file = project.addFile(desiredPath, groupKey);
  }

  if (!file) {
    const fileRef = project.generateUuid();
    const fileReferenceSection = project.pbxFileReferenceSection();
    const basename = path.basename(desiredPath);

    fileReferenceSection[fileRef] = {
      isa: "PBXFileReference",
      path: desiredPath,
      sourceTree,
    };
    fileReferenceSection[`${fileRef}_comment`] = basename;

    file = {
      basename,
      fileRef,
    };
  }

  const fileRef = project.pbxFileReferenceSection()[file.fileRef];
  fileRef.path = desiredPath;
  fileRef.sourceTree = sourceTree;

  if (lastKnownFileType) {
    fileRef.lastKnownFileType = lastKnownFileType;
    delete fileRef.explicitFileType;
  }

  if (explicitFileType) {
    fileRef.explicitFileType = explicitFileType;
    delete fileRef.lastKnownFileType;
  }

  const alreadyInGroup = group.children.some((child) => child.value === file.fileRef);
  if (!alreadyInGroup) {
    project.addToPbxGroup(
      {
        basename: file.basename,
        fileRef: file.fileRef,
      },
      groupKey,
    );
  }

  return file;
}

function ensureTarget(project, name, type, subfolder, bundleId) {
  const existingKey = findTargetKey(project, name);
  if (existingKey) {
    return existingKey;
  }

  return project.addTarget(name, type, subfolder, bundleId).uuid;
}

function ensureTargetBuildPhase(project, targetUuid, phaseType, comment, options = {}) {
  const section = ensureSection(project, phaseType);
  const target = project.pbxNativeTargetSection()[targetUuid];

  for (const buildPhase of target.buildPhases ?? []) {
    if (buildPhase.comment !== comment) {
      continue;
    }

    if (section[buildPhase.value]) {
      return {
        uuid: buildPhase.value,
        phase: section[buildPhase.value],
      };
    }
  }

  const buildPhaseUuid = project.generateUuid();
  const buildPhase = {
    isa: phaseType,
    buildActionMask: 2147483647,
    files: [],
    runOnlyForDeploymentPostprocessing: 0,
  };

  if (phaseType === "PBXCopyFilesBuildPhase") {
    buildPhase.dstPath = options.dstPath ?? "";
    buildPhase.dstSubfolderSpec = options.dstSubfolderSpec ?? 0;
    buildPhase.name = comment;
  }

  section[buildPhaseUuid] = buildPhase;
  section[`${buildPhaseUuid}_comment`] = comment;
  target.buildPhases ??= [];
  target.buildPhases.push({
    value: buildPhaseUuid,
    comment,
  });

  return {
    uuid: buildPhaseUuid,
    phase: buildPhase,
  };
}

function setTargetBuildPhases(project, targetUuid, specs) {
  const target = project.pbxNativeTargetSection()[targetUuid];

  target.buildPhases = specs.map((spec) => {
    const { uuid } = ensureTargetBuildPhase(project, targetUuid, spec.type, spec.comment, spec.options);
    return {
      value: uuid,
      comment: spec.comment,
    };
  });
}

function ensurePhaseFile(project, phase, fileRef, comment, settings) {
  const buildFileSection = ensureSection(project, "PBXBuildFile");

  for (const buildPhaseFile of phase.files) {
    const buildFile = buildFileSection[buildPhaseFile.value];
    if (buildFile?.fileRef !== fileRef) {
      continue;
    }

    buildPhaseFile.comment = comment;
    buildFileSection[`${buildPhaseFile.value}_comment`] = comment;
    buildFile.fileRef_comment = stripQuotes(project.pbxFileReferenceSection()[`${fileRef}_comment`] ?? comment);

    if (settings) {
      buildFile.settings = settings;
    } else {
      delete buildFile.settings;
    }

    return {
      value: buildPhaseFile.value,
      comment,
    };
  }

  const buildFileUuid = project.generateUuid();
  buildFileSection[buildFileUuid] = {
    isa: "PBXBuildFile",
    fileRef,
    fileRef_comment: stripQuotes(project.pbxFileReferenceSection()[`${fileRef}_comment`] ?? comment),
  };

  if (settings) {
    buildFileSection[buildFileUuid].settings = settings;
  }

  buildFileSection[`${buildFileUuid}_comment`] = comment;

  return {
    value: buildFileUuid,
    comment,
  };
}

function setPhaseFiles(project, phase, descriptors) {
  const originalFiles = [...phase.files];
  phase.files = [];

  for (const descriptor of descriptors) {
    const existing = originalFiles.find((entry) => {
      const buildFile = project.pbxBuildFileSection()[entry.value];
      return buildFile?.fileRef === descriptor.fileRef;
    });

    if (existing) {
      phase.files.push(
        ensurePhaseFile(project, { files: [existing] }, descriptor.fileRef, descriptor.comment, descriptor.settings),
      );
      continue;
    }

    phase.files.push(
      ensurePhaseFile(project, { files: [] }, descriptor.fileRef, descriptor.comment, descriptor.settings),
    );
  }
}

function ensureTargetDependency(project, targetUuid, dependencyUuid) {
  const target = project.pbxNativeTargetSection()[targetUuid];
  const dependencySection = ensureSection(project, "PBXTargetDependency");
  const proxySection = ensureSection(project, "PBXContainerItemProxy");

  target.dependencies ??= [];

  for (const dependencyRef of target.dependencies) {
    const dependency = dependencySection[dependencyRef.value];
    if (dependency?.target === dependencyUuid) {
      return dependencyRef.value;
    }
  }

  const proxyUuid = project.generateUuid();
  const dependencyRecordUuid = project.generateUuid();
  const dependencyTarget = project.pbxNativeTargetSection()[dependencyUuid];

  proxySection[proxyUuid] = {
    isa: "PBXContainerItemProxy",
    containerPortal: project.hash.project.rootObject,
    containerPortal_comment: project.hash.project.rootObject_comment,
    proxyType: 1,
    remoteGlobalIDString: dependencyUuid,
    remoteInfo: dependencyTarget.name,
  };
  proxySection[`${proxyUuid}_comment`] = "PBXContainerItemProxy";

  dependencySection[dependencyRecordUuid] = {
    isa: "PBXTargetDependency",
    target: dependencyUuid,
    target_comment: dependencyTarget.name,
    targetProxy: proxyUuid,
    targetProxy_comment: "PBXContainerItemProxy",
  };
  dependencySection[`${dependencyRecordUuid}_comment`] = "PBXTargetDependency";

  target.dependencies.push({
    value: dependencyRecordUuid,
    comment: "PBXTargetDependency",
  });

  return dependencyRecordUuid;
}

function setBuildSettings(project, targetUuid, settingsByBuildName) {
  const configurationList = project.pbxXCConfigurationList()[project.pbxNativeTargetSection()[targetUuid].buildConfigurationList];

  for (const buildConfigurationRef of configurationList.buildConfigurations) {
    const buildName = stripQuotes(buildConfigurationRef.comment);
    const buildConfiguration = project.pbxXCBuildConfigurationSection()[buildConfigurationRef.value];
    buildConfiguration.buildSettings ??= {};
    Object.assign(
      buildConfiguration.buildSettings,
      settingsByBuildName.all ?? {},
      settingsByBuildName[buildName] ?? {},
    );
  }
}

function normalizeFileReference(project, fileRefKey, updates) {
  const fileRef = project.pbxFileReferenceSection()[fileRefKey];
  Object.assign(fileRef, updates);
}

function setGroupChildren(project, groupKey, fileRefs) {
  const group = project.getPBXGroupByKey(groupKey);
  group.children = fileRefs.map((fileRef) => ({
    value: fileRef,
    comment: stripQuotes(project.pbxFileReferenceSection()[`${fileRef}_comment`] ?? fileRef),
  }));
}

const project = xcode.project(projectPath);
await parseProject(project);

ensureSection(project, "PBXContainerItemProxy");
ensureSection(project, "PBXTargetDependency");

const firstProject = project.getFirstProject().firstProject;
const rootGroupKey = firstProject.mainGroup;
const appTargetUuid = ensureTarget(project, "App", "application", "App", "com.djngoma.devilsaidictionary");
const appGroupKey = findGroupKey(project, { path: "App" });
const sharedAppleGroupKey = ensureGroup(project, rootGroupKey, "SharedApple");
const watchAppGroupKey = ensureGroup(project, rootGroupKey, "DictionaryWatchApp");
const watchExtensionGroupKey = ensureGroup(project, rootGroupKey, "DictionaryWatchExtension");

ensureGroup(project, rootGroupKey, "Resources");

const watchAppTargetUuid = ensureTarget(
  project,
  "DictionaryWatchApp",
  "watch2_app",
  "DictionaryWatchApp",
  "com.djngoma.devilsaidictionary.watchkitapp",
);
const watchExtensionTargetUuid = ensureTarget(
  project,
  "DictionaryWatchExtension",
  "watch2_extension",
  "DictionaryWatchExtension",
  "com.djngoma.devilsaidictionary.watchkitapp.watchkitextension",
);

const nativeDictionaryModelFile = ensureFileInGroup(project, appGroupKey, {
  desiredPath: "NativeDictionaryModel.swift",
  legacyPaths: ["App/NativeDictionaryModel.swift"],
  lastKnownFileType: "sourcecode.swift",
});
const nativeUIFile = ensureFileInGroup(project, appGroupKey, {
  desiredPath: "NativeUI.swift",
  legacyPaths: ["App/NativeUI.swift"],
  lastKnownFileType: "sourcecode.swift",
});
const nativeDictionaryRootViewFile = ensureFileInGroup(project, appGroupKey, {
  desiredPath: "NativeDictionaryRootView.swift",
  legacyPaths: ["App/NativeDictionaryRootView.swift"],
  lastKnownFileType: "sourcecode.swift",
});
const nativeEntryDetailViewFile = ensureFileInGroup(project, appGroupKey, {
  desiredPath: "NativeEntryDetailView.swift",
  legacyPaths: ["App/NativeEntryDetailView.swift"],
  lastKnownFileType: "sourcecode.swift",
});
const phoneCurrentWordManagerFile = ensureFileInGroup(project, appGroupKey, {
  desiredPath: "PhoneCurrentWordManager.swift",
  legacyPaths: ["App/PhoneCurrentWordManager.swift"],
  lastKnownFileType: "sourcecode.swift",
});
ensureFileInGroup(project, appGroupKey, {
  desiredPath: "App.entitlements",
  legacyPaths: ["App/App.entitlements"],
});

const dictionaryCatalogSnapshotFile = ensureFileInGroup(project, sharedAppleGroupKey, {
  desiredPath: "DictionaryCatalogSnapshot.swift",
  legacyPaths: ["SharedApple/DictionaryCatalogSnapshot.swift"],
  lastKnownFileType: "sourcecode.swift",
});
const currentWordStorageFile = ensureFileInGroup(project, sharedAppleGroupKey, {
  desiredPath: "CurrentWordStorage.swift",
  legacyPaths: ["SharedApple/CurrentWordStorage.swift"],
  lastKnownFileType: "sourcecode.swift",
});
const coreSwiftFile = ensureFileInGroup(project, sharedAppleGroupKey, {
  desiredPath: "../../shared/swift-core/Sources/DevilsAIDictionaryCore/DevilsAIDictionaryCore.swift",
  sourceTree: "SOURCE_ROOT",
  lastKnownFileType: "sourcecode.swift",
});
const entriesJsonFile = ensureFileInGroup(project, sharedAppleGroupKey, {
  desiredPath: "../../src/generated/entries.generated.json",
  sourceTree: "SOURCE_ROOT",
});

const watchAppInfoPlistFile = ensureFileInGroup(project, watchAppGroupKey, {
  desiredPath: "Info.plist",
  legacyPaths: ["DictionaryWatchApp/Info.plist"],
  lastKnownFileType: "text.plist.xml",
});
const watchAppAssetsFile = ensureFileInGroup(project, watchAppGroupKey, {
  desiredPath: "Assets.xcassets",
  legacyPaths: ["DictionaryWatchApp/Assets.xcassets"],
  lastKnownFileType: "folder.assetcatalog",
});

const watchExtensionInfoPlistFile = ensureFileInGroup(project, watchExtensionGroupKey, {
  desiredPath: "Info.plist",
  legacyPaths: ["DictionaryWatchExtension/Info.plist"],
  lastKnownFileType: "text.plist.xml",
});
const dictionaryWatchAppSwiftFile = ensureFileInGroup(project, watchExtensionGroupKey, {
  desiredPath: "DictionaryWatchApp.swift",
  legacyPaths: ["DictionaryWatchExtension/DictionaryWatchApp.swift"],
  lastKnownFileType: "sourcecode.swift",
});
const watchCurrentWordModelFile = ensureFileInGroup(project, watchExtensionGroupKey, {
  desiredPath: "WatchCurrentWordModel.swift",
  legacyPaths: ["DictionaryWatchExtension/WatchCurrentWordModel.swift"],
  lastKnownFileType: "sourcecode.swift",
});
const watchCurrentWordViewFile = ensureFileInGroup(project, watchExtensionGroupKey, {
  desiredPath: "WatchCurrentWordView.swift",
  legacyPaths: ["DictionaryWatchExtension/WatchCurrentWordView.swift"],
  lastKnownFileType: "sourcecode.swift",
});

setGroupChildren(project, sharedAppleGroupKey, [
  dictionaryCatalogSnapshotFile.fileRef,
  currentWordStorageFile.fileRef,
  coreSwiftFile.fileRef,
  entriesJsonFile.fileRef,
]);

setGroupChildren(project, appGroupKey, [
  "504EC3071FED79650016851F",
  nativeDictionaryModelFile.fileRef,
  nativeUIFile.fileRef,
  nativeDictionaryRootViewFile.fileRef,
  nativeEntryDetailViewFile.fileRef,
  "504EC30E1FED79650016851F",
  "504EC3101FED79650016851F",
  "504EC3131FED79650016851F",
  phoneCurrentWordManagerFile.fileRef,
  "FA7D2814C3EB4EC8A6C7DADD",
]);

setGroupChildren(project, watchAppGroupKey, [
  watchAppInfoPlistFile.fileRef,
  watchAppAssetsFile.fileRef,
]);

setGroupChildren(project, watchExtensionGroupKey, [
  watchExtensionInfoPlistFile.fileRef,
  dictionaryWatchAppSwiftFile.fileRef,
  watchCurrentWordModelFile.fileRef,
  watchCurrentWordViewFile.fileRef,
]);

const appSources = ensureTargetBuildPhase(project, appTargetUuid, "PBXSourcesBuildPhase", "Sources").phase;
const appResources = ensureTargetBuildPhase(project, appTargetUuid, "PBXResourcesBuildPhase", "Resources").phase;
ensureTargetBuildPhase(project, appTargetUuid, "PBXFrameworksBuildPhase", "Frameworks");
const appEmbedWatchContent = ensureTargetBuildPhase(project, appTargetUuid, "PBXCopyFilesBuildPhase", "Embed Watch Content", {
  dstPath: "$(CONTENTS_FOLDER_PATH)/Watch",
  dstSubfolderSpec: 16,
}).phase;

const watchAppFrameworks = ensureTargetBuildPhase(
  project,
  watchAppTargetUuid,
  "PBXFrameworksBuildPhase",
  "Frameworks",
).phase;
const watchAppResources = ensureTargetBuildPhase(
  project,
  watchAppTargetUuid,
  "PBXResourcesBuildPhase",
  "Resources",
).phase;
const watchAppEmbedExtensions = ensureTargetBuildPhase(
  project,
  watchAppTargetUuid,
  "PBXCopyFilesBuildPhase",
  "Embed App Extensions",
  {
    dstPath: "",
    dstSubfolderSpec: 13,
  },
).phase;

const watchExtensionSources = ensureTargetBuildPhase(
  project,
  watchExtensionTargetUuid,
  "PBXSourcesBuildPhase",
  "Sources",
).phase;
const watchExtensionFrameworks = ensureTargetBuildPhase(
  project,
  watchExtensionTargetUuid,
  "PBXFrameworksBuildPhase",
  "Frameworks",
).phase;
const watchExtensionResources = ensureTargetBuildPhase(
  project,
  watchExtensionTargetUuid,
  "PBXResourcesBuildPhase",
  "Resources",
).phase;

setTargetBuildPhases(project, appTargetUuid, [
  { type: "PBXSourcesBuildPhase", comment: "Sources" },
  { type: "PBXFrameworksBuildPhase", comment: "Frameworks" },
  { type: "PBXResourcesBuildPhase", comment: "Resources" },
  {
    type: "PBXCopyFilesBuildPhase",
    comment: "Embed Watch Content",
    options: {
      dstPath: "$(CONTENTS_FOLDER_PATH)/Watch",
      dstSubfolderSpec: 16,
    },
  },
]);

setTargetBuildPhases(project, watchAppTargetUuid, [
  { type: "PBXFrameworksBuildPhase", comment: "Frameworks" },
  { type: "PBXResourcesBuildPhase", comment: "Resources" },
  {
    type: "PBXCopyFilesBuildPhase",
    comment: "Embed App Extensions",
    options: {
      dstPath: "",
      dstSubfolderSpec: 13,
    },
  },
]);

setTargetBuildPhases(project, watchExtensionTargetUuid, [
  { type: "PBXSourcesBuildPhase", comment: "Sources" },
  { type: "PBXFrameworksBuildPhase", comment: "Frameworks" },
  { type: "PBXResourcesBuildPhase", comment: "Resources" },
]);

setPhaseFiles(project, appSources, [
  {
    fileRef: "504EC3071FED79650016851F",
    comment: "AppDelegate.swift in Sources",
  },
  {
    fileRef: nativeDictionaryModelFile.fileRef,
    comment: "NativeDictionaryModel.swift in Sources",
  },
  {
    fileRef: nativeUIFile.fileRef,
    comment: "NativeUI.swift in Sources",
  },
  {
    fileRef: nativeDictionaryRootViewFile.fileRef,
    comment: "NativeDictionaryRootView.swift in Sources",
  },
  {
    fileRef: nativeEntryDetailViewFile.fileRef,
    comment: "NativeEntryDetailView.swift in Sources",
  },
  {
    fileRef: phoneCurrentWordManagerFile.fileRef,
    comment: "PhoneCurrentWordManager.swift in Sources",
  },
  {
    fileRef: dictionaryCatalogSnapshotFile.fileRef,
    comment: "DictionaryCatalogSnapshot.swift in Sources",
  },
  {
    fileRef: currentWordStorageFile.fileRef,
    comment: "CurrentWordStorage.swift in Sources",
  },
  {
    fileRef: coreSwiftFile.fileRef,
    comment: "DevilsAIDictionaryCore.swift in Sources",
  },
]);

setPhaseFiles(project, appResources, [
  {
    fileRef: "504EC3101FED79650016851F",
    comment: "LaunchScreen.storyboard in Resources",
  },
  {
    fileRef: "504EC30E1FED79650016851F",
    comment: "Assets.xcassets in Resources",
  },
  {
    fileRef: entriesJsonFile.fileRef,
    comment: "entries.generated.json in Resources",
  },
]);

setPhaseFiles(project, appEmbedWatchContent, [
  {
    fileRef: "88C7C0B4CE4F4B34BB74EC8A",
    comment: "DictionaryWatchApp.app in Embed Watch Content",
    settings: {
      ATTRIBUTES: ["RemoveHeadersOnCopy"],
    },
  },
]);

setPhaseFiles(project, watchAppFrameworks, []);
setPhaseFiles(project, watchAppResources, [
  {
    fileRef: watchAppAssetsFile.fileRef,
    comment: "Assets.xcassets in Resources",
  },
]);
setPhaseFiles(project, watchAppEmbedExtensions, [
  {
    fileRef: "E058C8A503E44D40ACD09FA4",
    comment: "DictionaryWatchExtension.appex in Embed App Extensions",
    settings: {
      ATTRIBUTES: ["RemoveHeadersOnCopy"],
    },
  },
]);

setPhaseFiles(project, watchExtensionSources, [
  {
    fileRef: dictionaryCatalogSnapshotFile.fileRef,
    comment: "DictionaryCatalogSnapshot.swift in Sources",
  },
  {
    fileRef: currentWordStorageFile.fileRef,
    comment: "CurrentWordStorage.swift in Sources",
  },
  {
    fileRef: coreSwiftFile.fileRef,
    comment: "DevilsAIDictionaryCore.swift in Sources",
  },
  {
    fileRef: dictionaryWatchAppSwiftFile.fileRef,
    comment: "DictionaryWatchApp.swift in Sources",
  },
  {
    fileRef: watchCurrentWordModelFile.fileRef,
    comment: "WatchCurrentWordModel.swift in Sources",
  },
  {
    fileRef: watchCurrentWordViewFile.fileRef,
    comment: "WatchCurrentWordView.swift in Sources",
  },
]);
setPhaseFiles(project, watchExtensionFrameworks, []);
setPhaseFiles(project, watchExtensionResources, [
  {
    fileRef: entriesJsonFile.fileRef,
    comment: "entries.generated.json in Resources",
  },
]);

ensureTargetDependency(project, appTargetUuid, watchAppTargetUuid);
ensureTargetDependency(project, watchAppTargetUuid, watchExtensionTargetUuid);

setBuildSettings(project, appTargetUuid, {
  Debug: {
    APS_ENVIRONMENT: "development",
  },
  Release: {
    APS_ENVIRONMENT: "production",
  },
  all: {
    CODE_SIGN_ENTITLEMENTS: "App/App.entitlements",
  },
});

setBuildSettings(project, watchAppTargetUuid, {
  all: {
    ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: "AccentColor",
    CODE_SIGN_STYLE: "Automatic",
    CURRENT_PROJECT_VERSION: "1",
    DEVELOPMENT_TEAM: "5CND4GK432",
    INFOPLIST_FILE: "DictionaryWatchApp/Info.plist",
    LD_RUNPATH_SEARCH_PATHS: [
      '"$(inherited)"',
      '"@executable_path/Frameworks"',
      '"@executable_path/../../Frameworks"',
    ],
    MARKETING_VERSION: "1.0",
    PRODUCT_BUNDLE_IDENTIFIER: "com.djngoma.devilsaidictionary.watchkitapp",
    PRODUCT_NAME: '"$(TARGET_NAME)"',
    SDKROOT: "watchos",
    SKIP_INSTALL: "YES",
    SWIFT_VERSION: "5.0",
    TARGETED_DEVICE_FAMILY: "4",
    WATCHOS_DEPLOYMENT_TARGET: "10.0",
  },
  Debug: {
    GCC_PREPROCESSOR_DEFINITIONS: ['"DEBUG=1"', '"$(inherited)"'],
  },
});

setBuildSettings(project, watchExtensionTargetUuid, {
  all: {
    APPLICATION_EXTENSION_API_ONLY: "YES",
    CODE_SIGN_STYLE: "Automatic",
    CURRENT_PROJECT_VERSION: "1",
    DEVELOPMENT_TEAM: "5CND4GK432",
    INFOPLIST_FILE: "DictionaryWatchExtension/Info.plist",
    LD_RUNPATH_SEARCH_PATHS: [
      '"$(inherited)"',
      '"@executable_path/Frameworks"',
      '"@executable_path/../../Frameworks"',
    ],
    MARKETING_VERSION: "1.0",
    PRODUCT_BUNDLE_IDENTIFIER: "com.djngoma.devilsaidictionary.watchkitapp.watchkitextension",
    PRODUCT_NAME: '"$(TARGET_NAME)"',
    SDKROOT: "watchos",
    SKIP_INSTALL: "YES",
    SWIFT_VERSION: "5.0",
    TARGETED_DEVICE_FAMILY: "4",
    WATCHOS_DEPLOYMENT_TARGET: "10.0",
  },
  Debug: {
    GCC_PREPROCESSOR_DEFINITIONS: ['"DEBUG=1"', '"$(inherited)"'],
  },
});

const targetAttributes = firstProject.attributes.TargetAttributes ?? {};
targetAttributes[appTargetUuid] = {
  ...(targetAttributes[appTargetUuid] ?? {}),
  ProvisioningStyle: "Automatic",
  SystemCapabilities: {
    ...(targetAttributes[appTargetUuid]?.SystemCapabilities ?? {}),
    "com.apple.Push": {
      enabled: 1,
    },
    "com.apple.WatchKit": {
      enabled: 1,
    },
  },
};
targetAttributes[watchAppTargetUuid] = {
  ...(targetAttributes[watchAppTargetUuid] ?? {}),
  ProvisioningStyle: "Automatic",
};
targetAttributes[watchExtensionTargetUuid] = {
  ...(targetAttributes[watchExtensionTargetUuid] ?? {}),
  ProvisioningStyle: "Automatic",
};
firstProject.attributes.TargetAttributes = targetAttributes;

normalizeFileReference(project, "504EC30E1FED79650016851F", {
  sourceTree: '"<group>"',
});
normalizeFileReference(project, "504EC3131FED79650016851F", {
  sourceTree: '"<group>"',
});
normalizeFileReference(project, "4F269170F8A34E158CAE1AC3", {
  sourceTree: '"<group>"',
});
normalizeFileReference(project, "9A37C6C20E014F8A9806E8AE", {
  sourceTree: '"<group>"',
});
normalizeFileReference(project, "E636E11094224B7DB08F20B5", {
  sourceTree: '"<group>"',
});
normalizeFileReference(project, "88C7C0B4CE4F4B34BB74EC8A", {
  path: "DictionaryWatchApp.app",
  sourceTree: "BUILT_PRODUCTS_DIR",
  explicitFileType: "wrapper.application",
});
delete project.pbxFileReferenceSection()["88C7C0B4CE4F4B34BB74EC8A"].lastKnownFileType;

normalizeFileReference(project, "E058C8A503E44D40ACD09FA4", {
  path: "DictionaryWatchExtension.appex",
  sourceTree: "BUILT_PRODUCTS_DIR",
  explicitFileType: "wrapper.app-extension",
});
delete project.pbxFileReferenceSection()["E058C8A503E44D40ACD09FA4"].lastKnownFileType;

void watchAppInfoPlistFile;
void watchExtensionInfoPlistFile;

fs.writeFileSync(projectPath, project.writeSync());
console.log("Updated ios/App/App.xcodeproj for watch targets and native current-word services.");
