module.exports = {
  root: true,
  extends: ["@react-native-community", "plugin:prettier/recommended"],
  rules: {
    // 这里可以加你自己的规则
    "prettier/prettier": [
      "error",
      {
        singleQuote: true,
        trailingComma: "all",
        semi: false,
      },
    ],
  },
};
