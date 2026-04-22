import { describe, expect, it } from "vitest";

import {
  buildDefaultIPhoneMatrix,
  buildSupportedIPhoneMatrix,
  pickLatestAvailableIOSRuntime,
  selectIPhoneDevices,
} from "../../scripts/ios-ui-smoke-matrix.mjs";

describe("pickLatestAvailableIOSRuntime", () => {
  it("chooses the newest available iOS runtime", () => {
    const runtime = pickLatestAvailableIOSRuntime([
      { isAvailable: true, platform: "iOS", version: "26.4.1", name: "iOS 26.4.1" },
      { isAvailable: true, platform: "iOS", version: "26.5", name: "iOS 26.5" },
      { isAvailable: false, platform: "iOS", version: "27.0", name: "iOS 27.0 beta" },
      { isAvailable: true, platform: "watchOS", version: "26.5", name: "watchOS 26.5" },
    ]);

    expect(runtime.name).toBe("iOS 26.5");
  });
});

describe("buildSupportedIPhoneMatrix", () => {
  it("keeps only the supported iPhone simulator types for the latest runtime", () => {
    const runtime = {
      identifier: "com.apple.CoreSimulator.SimRuntime.iOS-26-5",
      name: "iOS 26.5",
      supportedDeviceTypes: [
        {
          identifier: "com.apple.CoreSimulator.SimDeviceType.iPhone-17",
          name: "iPhone 17",
          productFamily: "iPhone",
        },
        {
          identifier: "com.apple.CoreSimulator.SimDeviceType.iPhone-17e",
          name: "iPhone 17e",
          productFamily: "iPhone",
        },
        {
          identifier: "com.apple.CoreSimulator.SimDeviceType.iPhone-Air",
          name: "iPhone Air",
          productFamily: "iPhone",
        },
        {
          identifier: "com.apple.CoreSimulator.SimDeviceType.iPad-Pro-13-inch-M5-12GB",
          name: "iPad Pro 13-inch (M5)",
          productFamily: "iPad",
        },
      ],
    };

    const matrix = buildSupportedIPhoneMatrix({ runtime });

    expect(matrix).toEqual([
      {
        name: "iPhone 17",
        runtimeIdentifier: "com.apple.CoreSimulator.SimRuntime.iOS-26-5",
        runtimeName: "iOS 26.5",
        deviceTypeIdentifier: "com.apple.CoreSimulator.SimDeviceType.iPhone-17",
      },
      {
        name: "iPhone 17e",
        runtimeIdentifier: "com.apple.CoreSimulator.SimRuntime.iOS-26-5",
        runtimeName: "iOS 26.5",
        deviceTypeIdentifier: "com.apple.CoreSimulator.SimDeviceType.iPhone-17e",
      },
      {
        name: "iPhone Air",
        runtimeIdentifier: "com.apple.CoreSimulator.SimRuntime.iOS-26-5",
        runtimeName: "iOS 26.5",
        deviceTypeIdentifier: "com.apple.CoreSimulator.SimDeviceType.iPhone-Air",
      },
    ]);
  });
});

describe("buildDefaultIPhoneMatrix", () => {
  it("keeps the current iPhone family plus the latest SE for the default build lane", () => {
    const matrix = [
      { name: "iPhone 17 Pro", deviceTypeIdentifier: "a" },
      { name: "iPhone 17 Pro Max", deviceTypeIdentifier: "b" },
      { name: "iPhone 17e", deviceTypeIdentifier: "c" },
      { name: "iPhone 17", deviceTypeIdentifier: "d" },
      { name: "iPhone Air", deviceTypeIdentifier: "e" },
      { name: "iPhone 16 Pro", deviceTypeIdentifier: "f" },
      { name: "iPhone 16", deviceTypeIdentifier: "g" },
      { name: "iPhone SE (2nd generation)", deviceTypeIdentifier: "h" },
      { name: "iPhone SE (3rd generation)", deviceTypeIdentifier: "i" },
    ];

    expect(buildDefaultIPhoneMatrix(matrix)).toEqual([
      { name: "iPhone 17 Pro", deviceTypeIdentifier: "a" },
      { name: "iPhone 17 Pro Max", deviceTypeIdentifier: "b" },
      { name: "iPhone 17e", deviceTypeIdentifier: "c" },
      { name: "iPhone 17", deviceTypeIdentifier: "d" },
      { name: "iPhone Air", deviceTypeIdentifier: "e" },
      { name: "iPhone SE (3rd generation)", deviceTypeIdentifier: "i" },
    ]);
  });
});

describe("selectIPhoneDevices", () => {
  it("filters the matrix to the requested simulator names", () => {
    const matrix = [
      { name: "iPhone 17", udid: "one" },
      { name: "iPhone 17e", udid: "two" },
      { name: "iPhone Air", udid: "three" },
    ];

    expect(selectIPhoneDevices(matrix, ["iPhone 17e"])).toEqual([{ name: "iPhone 17e", udid: "two" }]);
  });

  it("fails clearly when a requested simulator is missing", () => {
    const matrix = [{ name: "iPhone 17", udid: "one" }];

    expect(() => selectIPhoneDevices(matrix, ["iPhone Air"])).toThrow(
      /Requested iPhone simulator\(s\) not available/,
    );
  });
});
