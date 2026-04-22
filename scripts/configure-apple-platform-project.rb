#!/usr/bin/env ruby
# frozen_string_literal: true

require 'pathname'

begin
  require 'xcodeproj'
rescue LoadError
  abort('Install the Ruby gem `xcodeproj` before running `npm run apple:project`.')
end

require 'xcodeproj/scheme'

REPO_ROOT = Pathname.new(__dir__).join('..').realpath
PROJECT_PATH = REPO_ROOT.join('ios', 'App', "The Devil's AI Dictionary.xcodeproj")
PROJECT = Xcodeproj::Project.open(PROJECT_PATH.to_s)

IOS_TARGET_NAME = "The Devil's AI Dictionary"
UI_TEST_TARGET_NAME = 'TheDevilsAIDictionaryUITests'
MAC_TARGET_NAME = "The Devil's AI Dictionary macOS"
VISION_TARGET_NAME = "The Devil's AI Dictionary visionOS"
BUNDLE_IDENTIFIER = 'com.djngoma.devilsaidictionary'
UI_TEST_BUNDLE_IDENTIFIER = 'com.djngoma.devilsaidictionaryUITests'

def ensure_group(parent, name, path)
  parent[name] || parent.new_group(name, path)
end

def ensure_file(group, path)
  group.files.find { |file| file.path == path } || group.new_file(path)
end

def ensure_target(project, name, platform, deployment_target, type = :application)
  desired_product_type = Xcodeproj::Constants::PRODUCT_TYPE_UTI.fetch(type)
  target = project.targets.find { |item| item.name == name }

  if target && target.product_type != desired_product_type
    target.remove_from_project
    target = nil
  end

  target ||
    project.new_target(type, name, platform, deployment_target, project.products_group, :swift, name)
end

def ensure_target_attributes(project, target)
  project.root_object.attributes['TargetAttributes'] ||= {}
  project.root_object.attributes['TargetAttributes'][target.uuid] ||= {}
  project.root_object.attributes['TargetAttributes'][target.uuid]['ProvisioningStyle'] = 'Automatic'
end

def ensure_test_target_attributes(project, target, test_target)
  ensure_target_attributes(project, target)
  project.root_object.attributes['TargetAttributes'][target.uuid]['TestTargetID'] = test_target.uuid
end

def configure_target(target, settings_by_name)
  target.build_configurations.each do |config|
    settings = settings_by_name.fetch(config.name)
    config.build_settings.merge!(settings)
  end
end

def add_sources(target, file_references)
  target.add_file_references(file_references)
end

def add_resources(target, file_references)
  target.add_resources(file_references)
end

def ensure_target_dependency(target, dependency)
  return if target.dependencies.any? { |item| item.target == dependency }

  target.add_dependency(dependency)
end

def ensure_shared_scheme(project_path, scheme_name, runnable_target, test_targets)
  scheme = Xcodeproj::XCScheme.new
  scheme.configure_with_targets(runnable_target, nil, launch_target: true)

  test_targets.each do |test_target|
    scheme.add_build_target(test_target, false)
    testable = Xcodeproj::XCScheme::TestAction::TestableReference.new(test_target)
    testable.parallelizable = false
    scheme.test_action.add_testable(testable)
  end

  scheme.test_action.xml_element.attributes['shouldAutocreateTestPlan'] = 'YES'
  scheme.save_as(project_path.to_s, scheme_name, true)
end

main_group = PROJECT.main_group
ios_group = main_group['TheDevilsAIDictionary']
shared_group = main_group['SharedApple']

abort('Expected TheDevilsAIDictionary group in the Xcode project.') unless ios_group
abort('Expected SharedApple group in the Xcode project.') unless shared_group

mac_group = ensure_group(main_group, MAC_TARGET_NAME, 'TheDevilsAIDictionary-macOS')
vision_group = ensure_group(main_group, VISION_TARGET_NAME, 'TheDevilsAIDictionary-visionOS')
ui_test_group = ensure_group(main_group, UI_TEST_TARGET_NAME, UI_TEST_TARGET_NAME)

ios_target = PROJECT.targets.find { |target| target.name == IOS_TARGET_NAME }
abort("Expected #{IOS_TARGET_NAME} target in the Xcode project.") unless ios_target

ios_target_settings = ios_target.build_configurations.each_with_object({}) do |config, memo|
  memo[config.name] = config.build_settings
end

team_id = ios_target_settings.fetch('Debug')['DEVELOPMENT_TEAM']
marketing_version = ios_target_settings.fetch('Debug')['MARKETING_VERSION']
current_project_version = ios_target_settings.fetch('Debug')['CURRENT_PROJECT_VERSION']
ios_deployment_target = ios_target_settings.fetch('Debug')['IPHONEOS_DEPLOYMENT_TARGET']

native_app = ensure_file(ios_group, 'NativeDictionaryApp.swift')
ios_sources = [
  ensure_file(ios_group, 'AppDelegate.swift'),
  native_app,
  ensure_file(ios_group, 'NativeDictionaryModel.swift'),
  ensure_file(ios_group, 'NativeUI.swift'),
  ensure_file(ios_group, 'NativeDictionaryRootView.swift'),
  ensure_file(ios_group, 'NativeEntryDetailView.swift'),
  ensure_file(ios_group, 'PhoneCurrentWordManager.swift'),
  shared_group.files.find { |file| file.path == 'DictionaryCatalogSnapshot.swift' },
  shared_group.files.find { |file| file.path == 'CurrentWordStorage.swift' },
  shared_group.files.find { |file| file.path&.end_with?('DevilsAIDictionaryCore.swift') },
].compact

shared_resources = [
  shared_group.files.find { |file| file.path&.end_with?('entries.generated.json') },
  ensure_file(ios_group, 'PrivacyInfo.xcprivacy'),
].compact

add_sources(ios_target, ios_sources)

mac_target = ensure_target(PROJECT, MAC_TARGET_NAME, :osx, '14.0')
vision_target = ensure_target(PROJECT, VISION_TARGET_NAME, :visionos, '1.0')
ui_test_target = ensure_target(PROJECT, UI_TEST_TARGET_NAME, :ios, ios_deployment_target, :ui_test_bundle)

[mac_target, vision_target].each { |target| ensure_target_attributes(PROJECT, target) }
ensure_test_target_attributes(PROJECT, ui_test_target, ios_target)

mac_sources = ios_sources
vision_sources = ios_sources
ui_test_sources = [
  ensure_file(ui_test_group, 'SmokeLaunchSupport.swift'),
  ensure_file(ui_test_group, 'TheDevilsAIDictionaryUITests.swift'),
]

mac_resources = [
  ensure_file(mac_group, 'Assets.xcassets'),
  *shared_resources,
]

vision_resources = [
  ensure_file(vision_group, 'Assets.xcassets'),
  *shared_resources,
]

add_sources(mac_target, mac_sources)
add_sources(vision_target, vision_sources)
add_resources(mac_target, mac_resources)
add_resources(vision_target, vision_resources)
add_sources(ui_test_target, ui_test_sources)
ensure_target_dependency(ui_test_target, ios_target)

common_debug_flags = 'DEBUG'

configure_target(
  mac_target,
  'Debug' => {
    'ASSETCATALOG_COMPILER_APPICON_NAME' => 'AppIcon',
    'CODE_SIGN_ENTITLEMENTS' => 'TheDevilsAIDictionary-macOS/TheDevilsAIDictionary-macOS.entitlements',
    'CODE_SIGN_STYLE' => 'Automatic',
    'CURRENT_PROJECT_VERSION' => current_project_version,
    'DEVELOPMENT_TEAM' => team_id,
    'INFOPLIST_FILE' => 'TheDevilsAIDictionary-macOS/Info.plist',
    'MACOSX_DEPLOYMENT_TARGET' => '14.0',
    'MARKETING_VERSION' => marketing_version,
    'PRODUCT_BUNDLE_IDENTIFIER' => BUNDLE_IDENTIFIER,
    'PRODUCT_NAME' => '$(TARGET_NAME)',
    'SWIFT_ACTIVE_COMPILATION_CONDITIONS' => common_debug_flags,
    'SWIFT_VERSION' => '5.0',
    'SUPPORTED_PLATFORMS' => 'macosx',
  },
  'Release' => {
    'ASSETCATALOG_COMPILER_APPICON_NAME' => 'AppIcon',
    'CODE_SIGN_ENTITLEMENTS' => 'TheDevilsAIDictionary-macOS/TheDevilsAIDictionary-macOS.entitlements',
    'CODE_SIGN_STYLE' => 'Automatic',
    'CURRENT_PROJECT_VERSION' => current_project_version,
    'DEVELOPMENT_TEAM' => team_id,
    'INFOPLIST_FILE' => 'TheDevilsAIDictionary-macOS/Info.plist',
    'MACOSX_DEPLOYMENT_TARGET' => '14.0',
    'MARKETING_VERSION' => marketing_version,
    'PRODUCT_BUNDLE_IDENTIFIER' => BUNDLE_IDENTIFIER,
    'PRODUCT_NAME' => '$(TARGET_NAME)',
    'SWIFT_ACTIVE_COMPILATION_CONDITIONS' => '',
    'SWIFT_VERSION' => '5.0',
    'SUPPORTED_PLATFORMS' => 'macosx',
  },
)

configure_target(
  vision_target,
  'Debug' => {
    'ASSETCATALOG_COMPILER_APPICON_NAME' => 'AppIcon',
    'CODE_SIGN_ENTITLEMENTS' => 'TheDevilsAIDictionary-visionOS/TheDevilsAIDictionary-visionOS.entitlements',
    'CODE_SIGN_STYLE' => 'Automatic',
    'CURRENT_PROJECT_VERSION' => current_project_version,
    'DEVELOPMENT_TEAM' => team_id,
    'INFOPLIST_FILE' => 'TheDevilsAIDictionary-visionOS/Info.plist',
    'LD_RUNPATH_SEARCH_PATHS' => ['$(inherited)', '@executable_path/Frameworks'],
    'MARKETING_VERSION' => marketing_version,
    'PRODUCT_BUNDLE_IDENTIFIER' => BUNDLE_IDENTIFIER,
    'PRODUCT_NAME' => '$(TARGET_NAME)',
    'SUPPORTED_PLATFORMS' => 'xros xrsimulator',
    'SWIFT_ACTIVE_COMPILATION_CONDITIONS' => common_debug_flags,
    'SWIFT_VERSION' => '5.0',
    'TARGETED_DEVICE_FAMILY' => '7',
    'XROS_DEPLOYMENT_TARGET' => '1.0',
  },
  'Release' => {
    'ASSETCATALOG_COMPILER_APPICON_NAME' => 'AppIcon',
    'CODE_SIGN_ENTITLEMENTS' => 'TheDevilsAIDictionary-visionOS/TheDevilsAIDictionary-visionOS.entitlements',
    'CODE_SIGN_STYLE' => 'Automatic',
    'CURRENT_PROJECT_VERSION' => current_project_version,
    'DEVELOPMENT_TEAM' => team_id,
    'INFOPLIST_FILE' => 'TheDevilsAIDictionary-visionOS/Info.plist',
    'LD_RUNPATH_SEARCH_PATHS' => ['$(inherited)', '@executable_path/Frameworks'],
    'MARKETING_VERSION' => marketing_version,
    'PRODUCT_BUNDLE_IDENTIFIER' => BUNDLE_IDENTIFIER,
    'PRODUCT_NAME' => '$(TARGET_NAME)',
    'SUPPORTED_PLATFORMS' => 'xros xrsimulator',
    'SWIFT_ACTIVE_COMPILATION_CONDITIONS' => '',
    'SWIFT_VERSION' => '5.0',
    'TARGETED_DEVICE_FAMILY' => '7',
    'XROS_DEPLOYMENT_TARGET' => '1.0',
  },
)

configure_target(
  ui_test_target,
  'Debug' => {
    'CODE_SIGN_STYLE' => 'Automatic',
    'CURRENT_PROJECT_VERSION' => current_project_version,
    'DEVELOPMENT_TEAM' => team_id,
    'GENERATE_INFOPLIST_FILE' => 'YES',
    'IPHONEOS_DEPLOYMENT_TARGET' => ios_deployment_target,
    'MARKETING_VERSION' => marketing_version,
    'PRODUCT_BUNDLE_IDENTIFIER' => UI_TEST_BUNDLE_IDENTIFIER,
    'PRODUCT_NAME' => '$(TARGET_NAME)',
    'SWIFT_ACTIVE_COMPILATION_CONDITIONS' => common_debug_flags,
    'SWIFT_VERSION' => '5.0',
    'TARGETED_DEVICE_FAMILY' => '1,2',
    'TEST_TARGET_NAME' => IOS_TARGET_NAME,
  },
  'Release' => {
    'CODE_SIGN_STYLE' => 'Automatic',
    'CURRENT_PROJECT_VERSION' => current_project_version,
    'DEVELOPMENT_TEAM' => team_id,
    'GENERATE_INFOPLIST_FILE' => 'YES',
    'IPHONEOS_DEPLOYMENT_TARGET' => ios_deployment_target,
    'MARKETING_VERSION' => marketing_version,
    'PRODUCT_BUNDLE_IDENTIFIER' => UI_TEST_BUNDLE_IDENTIFIER,
    'PRODUCT_NAME' => '$(TARGET_NAME)',
    'SWIFT_ACTIVE_COMPILATION_CONDITIONS' => '',
    'SWIFT_VERSION' => '5.0',
    'TARGETED_DEVICE_FAMILY' => '1,2',
    'TEST_TARGET_NAME' => IOS_TARGET_NAME,
  },
)

PROJECT.save
ensure_shared_scheme(PROJECT_PATH, IOS_TARGET_NAME, ios_target, [ui_test_target])
