module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      ["inline-import", { paths: ["./drizzle"] }], // 👈 Added for Drizzle migrations
    ],
  };
};
