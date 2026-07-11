import typescriptEslint from "typescript-eslint";

export default typescriptEslint.config(
    {
        files: ["**/*.ts"],
    },
    ...typescriptEslint.configs.recommendedTypeChecked,
    {
        files: ["**/*.ts"],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "@typescript-eslint/naming-convention": ["warn", {
                selector: "import",
                format: ["camelCase", "PascalCase"],
            }],

            curly: "error",
            eqeqeq: "error",
            "no-throw-literal": "error",
            semi: "error",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-unused-vars": "error",
        },
    },
);