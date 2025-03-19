export default{
    "env": {
        "browser": true,
        "es6": true,
        "node": true
    },
    "globals": {
        "ENV": true,
        "getTime": function() {},
        "E": {}
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "sourceType": "module",
        "ecmaVersion": 2017
    },
    "rules": {
        "no-var":         "error",
        "no-unreachable": "warn",
        "complexity":     [ "warn", 4  ],
        "max-depth":      [ "warn", 4  ],
        "max-params":     [ "warn", 4  ],
        "max-statements": [ "warn", 30 ],

        "no-console": "off",
        "no-debugger": "warn",

        "prefer-template":        "error",
        "consistent-return":      "error",
        "class-methods-use-this": "error",
        "no-warning-comments":    "error",
        "no-unused-vars": [
            "error",
            { "argsIgnorePattern": "^_" }
        ],

        "default-case": [
            "error",
            { "commentPattern": "^skip\\sdefault" }
        ],
        "indent": [
            "warn",
            2
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "no-trailing-spaces": [
            "warn"
        ],
        "eol-last": [
            "error",
            "always"
        ],

        "quotes": [
            "warn",
            "single",
            { "allowTemplateLiterals": true }
        ],
        "semi": [
            "off", //"warn",
            "never"
        ],
    }
};