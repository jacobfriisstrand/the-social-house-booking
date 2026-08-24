Source: https://biomejs.dev/linter/domains/
Fetched: 2026-08-24

# Domains

_List of available domains_

(Content from the biomejs/website source file `src/content/docs/en/linter/domains.mdx`, which is the source of the rendered page.)

## Astro
Use this domain inside Astro projects. This domain enables rules that are specific to Astro projects.
### Astro activation
Enable the **recommended, non-nursery** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"astro": "recommended"
		}
	}
}
```

> **No recommended rules**
>
> Since all rules in this domain are nursery rules, no rules will be activated when enabling the domain. You need to enable the single rules.
Enabled the **all** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"astro": "all"
		}
	}
}
```
**Disable** all rules of the domain:
```json
{
	"linter": {
		"domains": {
			"astro": "none"
		}
	}
}
```
### Astro dependencies
Enabled when the following dependencies are declared:
- `astro`: `>=1.0.0`

### Astro rules
Rules that belong to the domain:
- [noAstroSetHtmlDirective](https://biomejs.dev/linter/rules/no-astro-set-html-directive/html) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useAstroClientOnlyDirectiveValue](https://biomejs.dev/linter/rules/use-astro-client-only-directive-value/html) [(nursery)](https://biomejs.dev/linter/#nursery)
## Drizzle
Use this domain with projects using Drizzle.
### Drizzle activation
Enable the **recommended, non-nursery** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"drizzle": "recommended"
		}
	}
}
```

> **No recommended rules**
>
> Since all rules in this domain are nursery rules, no rules will be activated when enabling the domain. You need to enable the single rules.
Enabled the **all** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"drizzle": "all"
		}
	}
}
```
**Disable** all rules of the domain:
```json
{
	"linter": {
		"domains": {
			"drizzle": "none"
		}
	}
}
```
### Drizzle dependencies
Enabled when the following dependencies are declared:
- `drizzle-orm`: `>=0.9.0`

### Drizzle rules
Rules that belong to the domain:
- [noDrizzleDeleteWithoutWhere](https://biomejs.dev/linter/rules/no-drizzle-delete-without-where/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noDrizzleUpdateWithoutWhere](https://biomejs.dev/linter/rules/no-drizzle-update-without-where/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
## Next
Use this domain inside Next.js projects.
### Next activation
Enable the **recommended, non-nursery** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"next": "recommended"
		}
	}
}
```
Enabled the **all** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"next": "all"
		}
	}
}
```
**Disable** all rules of the domain:
```json
{
	"linter": {
		"domains": {
			"next": "none"
		}
	}
}
```
### Next dependencies
Enabled when the following dependencies are declared:
- `next`: `>=14.0.0`

### Next rules
Rules that belong to the domain:
- [noBeforeInteractiveScriptOutsideDocument](https://biomejs.dev/linter/rules/no-before-interactive-script-outside-document/javascript)
- [noNextAsyncClientComponent](https://biomejs.dev/linter/rules/no-next-async-client-component/javascript)
- [useExhaustiveDependencies](https://biomejs.dev/linter/rules/use-exhaustive-dependencies/javascript) (recommended)
- [useHookAtTopLevel](https://biomejs.dev/linter/rules/use-hook-at-top-level/javascript) (recommended)
- [useInlineScriptId](https://biomejs.dev/linter/rules/use-inline-script-id/javascript) (recommended)
- [noImgElement](https://biomejs.dev/linter/rules/no-img-element/javascript) (recommended)
- [noSyncScripts](https://biomejs.dev/linter/rules/no-sync-scripts/javascript)
- [noUnwantedPolyfillio](https://biomejs.dev/linter/rules/no-unwanted-polyfillio/javascript) (recommended)
- [useGoogleFontPreconnect](https://biomejs.dev/linter/rules/use-google-font-preconnect/javascript) (recommended)
- [noHeadElement](https://biomejs.dev/linter/rules/no-head-element/javascript) (recommended)
- [noDocumentImportInPage](https://biomejs.dev/linter/rules/no-document-import-in-page/javascript) (recommended)
- [noHeadImportInDocument](https://biomejs.dev/linter/rules/no-head-import-in-document/javascript) (recommended)
## Playwright
Use this domain inside Playwright test projects. This domain enables rules that help enforce best practices and catch common mistakes when writing Playwright tests.
### Playwright activation
Enable the **recommended, non-nursery** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"playwright": "recommended"
		}
	}
}
```

> **No recommended rules**
>
> Since all rules in this domain are nursery rules, no rules will be activated when enabling the domain. You need to enable the single rules.
Enabled the **all** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"playwright": "all"
		}
	}
}
```
**Disable** all rules of the domain:
```json
{
	"linter": {
		"domains": {
			"playwright": "none"
		}
	}
}
```
### Playwright dependencies
Enabled when the following dependencies are declared:
- `@playwright/test`: `>=1.0.0`

### Playwright globals
When enabled, the following global bindings are recognised by Biome:
- `test`
- `expect`

### Playwright rules
Rules that belong to the domain:
- [noPlaywrightElementHandle](https://biomejs.dev/linter/rules/no-playwright-element-handle/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noPlaywrightEval](https://biomejs.dev/linter/rules/no-playwright-eval/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noPlaywrightForceOption](https://biomejs.dev/linter/rules/no-playwright-force-option/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noPlaywrightMissingAwait](https://biomejs.dev/linter/rules/no-playwright-missing-await/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noPlaywrightNetworkidle](https://biomejs.dev/linter/rules/no-playwright-networkidle/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noPlaywrightPagePause](https://biomejs.dev/linter/rules/no-playwright-page-pause/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noPlaywrightUselessAwait](https://biomejs.dev/linter/rules/no-playwright-useless-await/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noPlaywrightWaitForNavigation](https://biomejs.dev/linter/rules/no-playwright-wait-for-navigation/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noPlaywrightWaitForSelector](https://biomejs.dev/linter/rules/no-playwright-wait-for-selector/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noPlaywrightWaitForTimeout](https://biomejs.dev/linter/rules/no-playwright-wait-for-timeout/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [usePlaywrightValidDescribeCallback](https://biomejs.dev/linter/rules/use-playwright-valid-describe-callback/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
## Project
This domain contains rules that perform project-level analysis. This includes our module graph for dependency resolution. When enabling rules that belong to this domain, Biome will scan the entire project. The scanning phase will have a performance impact on the linting process. See the documentation on our [scanner](https://biomejs.dev/internals/architecture/#scanner) to learn more about the scanner.
### Project activation
Enable the **recommended, non-nursery** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"project": "recommended"
		}
	}
}
```
Enabled the **all** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"project": "all"
		}
	}
}
```
**Disable** all rules of the domain:
```json
{
	"linter": {
		"domains": {
			"project": "none"
		}
	}
}
```
### Project rules
Rules that belong to the domain:
- [noPrivateImports](https://biomejs.dev/linter/rules/no-private-imports/javascript) (recommended)
- [noUndeclaredDependencies](https://biomejs.dev/linter/rules/no-undeclared-dependencies/javascript)
- [noUnresolvedImports](https://biomejs.dev/linter/rules/no-unresolved-imports/javascript)
- [useImportExtensions](https://biomejs.dev/linter/rules/use-import-extensions/javascript)
- [useJsonImportAttributes](https://biomejs.dev/linter/rules/use-json-import-attributes/javascript)
- [noUndeclaredClasses](https://biomejs.dev/linter/rules/no-undeclared-classes/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noUndeclaredCustomProperties](https://biomejs.dev/linter/rules/no-undeclared-custom-properties/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noDeprecatedImports](https://biomejs.dev/linter/rules/no-deprecated-imports/javascript)
- [noImportCycles](https://biomejs.dev/linter/rules/no-import-cycles/javascript)
- [noUntrustedLicenses](https://biomejs.dev/linter/rules/no-untrusted-licenses/json) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noUndeclaredCustomProperties](https://biomejs.dev/linter/rules/no-undeclared-custom-properties/css) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noUnusedClasses](https://biomejs.dev/linter/rules/no-unused-classes/css) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noUndeclaredClasses](https://biomejs.dev/linter/rules/no-undeclared-classes/html) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noUndeclaredCustomProperties](https://biomejs.dev/linter/rules/no-undeclared-custom-properties/html) [(nursery)](https://biomejs.dev/linter/#nursery)
## Qwik
Use this domain inside Qwik projects. This domain enables rules that are specific to Qwik projects.
### Qwik activation
Enable the **recommended, non-nursery** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"qwik": "recommended"
		}
	}
}
```
Enabled the **all** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"qwik": "all"
		}
	}
}
```
**Disable** all rules of the domain:
```json
{
	"linter": {
		"domains": {
			"qwik": "none"
		}
	}
}
```
### Qwik dependencies
Enabled when the following dependencies are declared:
- `@builder.io/qwik`: `>=1.0.0`
- `@qwik.dev/core`: `>=2.0.0`

### Qwik rules
Rules that belong to the domain:
- [noQwikUseVisibleTask](https://biomejs.dev/linter/rules/no-qwik-use-visible-task/javascript) (recommended)
- [useImageSize](https://biomejs.dev/linter/rules/use-image-size/javascript) (recommended)
- [useJsxKeyInIterable](https://biomejs.dev/linter/rules/use-jsx-key-in-iterable/javascript) (recommended)
- [useQwikClasslist](https://biomejs.dev/linter/rules/use-qwik-classlist/javascript) (recommended)
- [useQwikMethodUsage](https://biomejs.dev/linter/rules/use-qwik-method-usage/javascript) (recommended)
- [useQwikValidLexicalScope](https://biomejs.dev/linter/rules/use-qwik-valid-lexical-scope/javascript) (recommended)
- [useQwikLoaderLocation](https://biomejs.dev/linter/rules/use-qwik-loader-location/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noReactSpecificProps](https://biomejs.dev/linter/rules/no-react-specific-props/javascript) (recommended)
## React
Use this domain inside React projects. It enables a set of rules that can help catching bugs and enforce correct practices. This domain enables rules that might conflict with the Solid domain.
### React activation
Enable the **recommended, non-nursery** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"react": "recommended"
		}
	}
}
```
Enabled the **all** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"react": "all"
		}
	}
}
```
**Disable** all rules of the domain:
```json
{
	"linter": {
		"domains": {
			"react": "none"
		}
	}
}
```
### React dependencies
Enabled when the following dependencies are declared:
- `react`: `>=16.0.0`

### React rules
Rules that belong to the domain:
- [noChildrenProp](https://biomejs.dev/linter/rules/no-children-prop/javascript) (recommended)
- [noNestedComponentDefinitions](https://biomejs.dev/linter/rules/no-nested-component-definitions/javascript)
- [noReactPropAssignments](https://biomejs.dev/linter/rules/no-react-prop-assignments/javascript)
- [noRenderReturnValue](https://biomejs.dev/linter/rules/no-render-return-value/javascript) (recommended)
- [useExhaustiveDependencies](https://biomejs.dev/linter/rules/use-exhaustive-dependencies/javascript) (recommended)
- [useHookAtTopLevel](https://biomejs.dev/linter/rules/use-hook-at-top-level/javascript) (recommended)
- [useJsxKeyInIterable](https://biomejs.dev/linter/rules/use-jsx-key-in-iterable/javascript) (recommended)
- [useUniqueElementIds](https://biomejs.dev/linter/rules/use-unique-element-ids/javascript)
- [noComponentHookFactories](https://biomejs.dev/linter/rules/no-component-hook-factories/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noJsxLeakedDollar](https://biomejs.dev/linter/rules/no-jsx-leaked-dollar/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noJsxNamespace](https://biomejs.dev/linter/rules/no-jsx-namespace/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noReactStringRefs](https://biomejs.dev/linter/rules/no-react-string-refs/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useReactAsyncServerFunction](https://biomejs.dev/linter/rules/use-react-async-server-function/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useReactCompiler](https://biomejs.dev/linter/rules/use-react-compiler/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useReactFunctionComponentDefinition](https://biomejs.dev/linter/rules/use-react-function-component-definition/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noJsxPropsBind](https://biomejs.dev/linter/rules/no-jsx-props-bind/javascript)
- [noSyncScripts](https://biomejs.dev/linter/rules/no-sync-scripts/javascript)
- [noDangerouslySetInnerHtml](https://biomejs.dev/linter/rules/no-dangerously-set-inner-html/javascript) (recommended)
- [noDangerouslySetInnerHtmlWithChildren](https://biomejs.dev/linter/rules/no-dangerously-set-inner-html-with-children/javascript) (recommended)
- [useComponentExportOnlyModules](https://biomejs.dev/linter/rules/use-component-export-only-modules/javascript)
- [useReactFunctionComponents](https://biomejs.dev/linter/rules/use-react-function-components/javascript)
- [noArrayIndexKey](https://biomejs.dev/linter/rules/no-array-index-key/javascript) (recommended)
- [noDuplicatedSpreadProps](https://biomejs.dev/linter/rules/no-duplicated-spread-props/javascript)
- [noLeakedRender](https://biomejs.dev/linter/rules/no-leaked-render/javascript)
- [noReactForwardRef](https://biomejs.dev/linter/rules/no-react-forward-ref/javascript)
- [noUnknownAttribute](https://biomejs.dev/linter/rules/no-unknown-attribute/javascript)
## ReactNative
Use this domain inside React Native projects. It enables a set of rules that help catch runtime issues specific to React Native, such as rendering raw text outside of `<Text>` components.
### ReactNative activation
Enable the **recommended, non-nursery** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"reactnative": "recommended"
		}
	}
}
```

> **No recommended rules**
>
> Since all rules in this domain are nursery rules, no rules will be activated when enabling the domain. You need to enable the single rules.
Enabled the **all** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"reactnative": "all"
		}
	}
}
```
**Disable** all rules of the domain:
```json
{
	"linter": {
		"domains": {
			"reactnative": "none"
		}
	}
}
```
### ReactNative dependencies
Enabled when the following dependencies are declared:
- `react-native`: `>=0.60.0`

### ReactNative rules
Rules that belong to the domain:
- [noReactNativeDeepImports](https://biomejs.dev/linter/rules/no-react-native-deep-imports/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noReactNativeLiteralColors](https://biomejs.dev/linter/rules/no-react-native-literal-colors/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noReactNativeRawText](https://biomejs.dev/linter/rules/no-react-native-raw-text/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useReactNativePlatformComponents](https://biomejs.dev/linter/rules/use-react-native-platform-components/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
## Solid
Use this domain inside Solid projects. This domain enables rules that might conflict with the React domain.
### Solid activation
Enable the **recommended, non-nursery** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"solid": "recommended"
		}
	}
}
```
Enabled the **all** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"solid": "all"
		}
	}
}
```
**Disable** all rules of the domain:
```json
{
	"linter": {
		"domains": {
			"solid": "none"
		}
	}
}
```
### Solid dependencies
Enabled when the following dependencies are declared:
- `solid`: `>=1.0.0`

### Solid rules
Rules that belong to the domain:
- [noSolidDestructuredProps](https://biomejs.dev/linter/rules/no-solid-destructured-props/javascript)
- [useSolidForComponent](https://biomejs.dev/linter/rules/use-solid-for-component/javascript)
- [noDuplicatedSpreadProps](https://biomejs.dev/linter/rules/no-duplicated-spread-props/javascript)
- [noReactSpecificProps](https://biomejs.dev/linter/rules/no-react-specific-props/javascript) (recommended)
## Svelte
Use this domain inside Svelte projects. This domain enables rules that are specific to Svelte projects.
### Svelte activation
Enable the **recommended, non-nursery** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"svelte": "recommended"
		}
	}
}
```

> **No recommended rules**
>
> Since all rules in this domain are nursery rules, no rules will be activated when enabling the domain. You need to enable the single rules.
Enabled the **all** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"svelte": "all"
		}
	}
}
```
**Disable** all rules of the domain:
```json
{
	"linter": {
		"domains": {
			"svelte": "none"
		}
	}
}
```
### Svelte dependencies
Enabled when the following dependencies are declared:
- `svelte`: `>=3.0.0`

### Svelte rules
Rules that belong to the domain:
- [noSvelteUnnecessaryStateWrap](https://biomejs.dev/linter/rules/no-svelte-unnecessary-state-wrap/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noSvelteLegacyConst](https://biomejs.dev/linter/rules/no-svelte-legacy-const/html) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useSvelteRequireEachKey](https://biomejs.dev/linter/rules/use-svelte-require-each-key/html) [(nursery)](https://biomejs.dev/linter/#nursery)
## Tailwind
Use this domain inside Tailwind CSS projects. This domain enables rules that are specific to Tailwind CSS.
### Tailwind activation
Enable the **recommended, non-nursery** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"tailwind": "recommended"
		}
	}
}
```

> **No recommended rules**
>
> Since all rules in this domain are nursery rules, no rules will be activated when enabling the domain. You need to enable the single rules.
Enabled the **all** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"tailwind": "all"
		}
	}
}
```
**Disable** all rules of the domain:
```json
{
	"linter": {
		"domains": {
			"tailwind": "none"
		}
	}
}
```
### Tailwind dependencies
Enabled when the following dependencies are declared:
- `tailwindcss`: `>=3.0.0`

### Tailwind rules
Rules that belong to the domain:
- [noTailwindArbitraryValue](https://biomejs.dev/linter/rules/no-tailwind-arbitrary-value/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useTailwindShorthandClasses](https://biomejs.dev/linter/rules/use-tailwind-shorthand-classes/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noTailwindArbitraryValue](https://biomejs.dev/linter/rules/no-tailwind-arbitrary-value/html) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useTailwindShorthandClasses](https://biomejs.dev/linter/rules/use-tailwind-shorthand-classes/html) [(nursery)](https://biomejs.dev/linter/#nursery)
## Test
Use this domain when linting test files. It enables a set of rules that are library agnostic, and can help to catch possible misuse of the test APIs.
### Test activation
Enable the **recommended, non-nursery** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"test": "recommended"
		}
	}
}
```
Enabled the **all** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"test": "all"
		}
	}
}
```
**Disable** all rules of the domain:
```json
{
	"linter": {
		"domains": {
			"test": "none"
		}
	}
}
```
### Test dependencies
Enabled when the following dependencies are declared:
- `jest`: `>=26.0.0`
- `mocha`: `>=8.0.0`
- `ava`: `>=2.0.0`
- `vitest`: `>=1.0.0`

### Test globals
When enabled, the following global bindings are recognised by Biome:
- `after`
- `afterAll`
- `afterEach`
- `before`
- `beforeEach`
- `beforeAll`
- `context`
- `describe`
- `it`
- `expect`
- `run`
- `setup`
- `specify`
- `suite`
- `suiteSetup`
- `suiteTeardown`
- `teardown`
- `test`
- `xcontext`
- `xdescribe`
- `xit`
- `xspecify`

### Test rules
Rules that belong to the domain:
- [noExcessiveNestedTestSuites](https://biomejs.dev/linter/rules/no-excessive-nested-test-suites/javascript)
- [noConditionalExpect](https://biomejs.dev/linter/rules/no-conditional-expect/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noIdenticalTestTitle](https://biomejs.dev/linter/rules/no-identical-test-title/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useConsistentTestIt](https://biomejs.dev/linter/rules/use-consistent-test-it/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useExpect](https://biomejs.dev/linter/rules/use-expect/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useTestHooksInOrder](https://biomejs.dev/linter/rules/use-test-hooks-in-order/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useTestHooksOnTop](https://biomejs.dev/linter/rules/use-test-hooks-on-top/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noDuplicateTestHooks](https://biomejs.dev/linter/rules/no-duplicate-test-hooks/javascript) (recommended)
- [noExportsInTest](https://biomejs.dev/linter/rules/no-exports-in-test/javascript) (recommended)
- [noFocusedTests](https://biomejs.dev/linter/rules/no-focused-tests/javascript) (recommended)
- [noSkippedTests](https://biomejs.dev/linter/rules/no-skipped-tests/javascript)
## Turborepo
Use this domain inside Turborepo projects. This domain enables rules that are specific to Turborepo projects.
### Turborepo activation
Enable the **recommended, non-nursery** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"turborepo": "recommended"
		}
	}
}
```
Enabled the **all** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"turborepo": "all"
		}
	}
}
```
**Disable** all rules of the domain:
```json
{
	"linter": {
		"domains": {
			"turborepo": "none"
		}
	}
}
```
### Turborepo dependencies
Enabled when the following dependencies are declared:
- `turbo`: `>=1.0.0`

### Turborepo rules
Rules that belong to the domain:
- [noUndeclaredEnvVars](https://biomejs.dev/linter/rules/no-undeclared-env-vars/javascript) (recommended)
## Types
This domain contains rules that perform project-level analysis. This includes our module graph for dependency resolution. When enabling rules that belong to this domain, Biome will scan the entire project, *and it will enable the inference engine to resolve and flat types*. The scanning phase will have a performance impact on the linting process. See the documentation on our [scanner](https://biomejs.dev/internals/architecture/#scanner) to learn more about the scanner.
### Types activation
Enable the **recommended, non-nursery** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"types": "recommended"
		}
	}
}
```
Enabled the **all** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"types": "all"
		}
	}
}
```
**Disable** all rules of the domain:
```json
{
	"linter": {
		"domains": {
			"types": "none"
		}
	}
}
```
### Types rules
Rules that belong to the domain:
- [useArrayFind](https://biomejs.dev/linter/rules/use-array-find/javascript)
- [noBaseToString](https://biomejs.dev/linter/rules/no-base-to-string/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noFloatingPromises](https://biomejs.dev/linter/rules/no-floating-promises/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noMisleadingReturnType](https://biomejs.dev/linter/rules/no-misleading-return-type/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noMisusedPromises](https://biomejs.dev/linter/rules/no-misused-promises/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noUnsafePlusOperands](https://biomejs.dev/linter/rules/no-unsafe-plus-operands/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noUselessTypeConversion](https://biomejs.dev/linter/rules/no-useless-type-conversion/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useAwaitThenable](https://biomejs.dev/linter/rules/use-await-thenable/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useDisposables](https://biomejs.dev/linter/rules/use-disposables/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useExhaustiveSwitchCases](https://biomejs.dev/linter/rules/use-exhaustive-switch-cases/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useIncludes](https://biomejs.dev/linter/rules/use-includes/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useNullishCoalescing](https://biomejs.dev/linter/rules/use-nullish-coalescing/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useRegexpExec](https://biomejs.dev/linter/rules/use-regexp-exec/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useStringStartsEndsWith](https://biomejs.dev/linter/rules/use-string-starts-ends-with/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useConsistentEnumValueType](https://biomejs.dev/linter/rules/use-consistent-enum-value-type/javascript)
- [noUnnecessaryConditions](https://biomejs.dev/linter/rules/no-unnecessary-conditions/javascript)
- [useArraySortCompare](https://biomejs.dev/linter/rules/use-array-sort-compare/javascript)
## Vue
Use this domain inside Vue projects. This domain enables rules that are specific to Vue projects.
### Vue activation
Enable the **recommended, non-nursery** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"vue": "recommended"
		}
	}
}
```
Enabled the **all** rules of the domain:
```json
{
	"linter": {
		"domains": {
			"vue": "all"
		}
	}
}
```
**Disable** all rules of the domain:
```json
{
	"linter": {
		"domains": {
			"vue": "none"
		}
	}
}
```
### Vue dependencies
Enabled when the following dependencies are declared:
- `vue`: `>=3.0.0`

### Vue rules
Rules that belong to the domain:
- [noVueDataObjectDeclaration](https://biomejs.dev/linter/rules/no-vue-data-object-declaration/javascript) (recommended)
- [noVueDuplicateKeys](https://biomejs.dev/linter/rules/no-vue-duplicate-keys/javascript) (recommended)
- [noVueReservedKeys](https://biomejs.dev/linter/rules/no-vue-reserved-keys/javascript) (recommended)
- [noVueReservedProps](https://biomejs.dev/linter/rules/no-vue-reserved-props/javascript) (recommended)
- [noVueSetupPropsReactivityLoss](https://biomejs.dev/linter/rules/no-vue-setup-props-reactivity-loss/javascript)
- [noVueImportCompilerMacros](https://biomejs.dev/linter/rules/no-vue-import-compiler-macros/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noVueRefAsOperand](https://biomejs.dev/linter/rules/no-vue-ref-as-operand/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useVueConsistentDefinePropsDeclaration](https://biomejs.dev/linter/rules/use-vue-consistent-define-props-declaration/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useVueNextTickPromise](https://biomejs.dev/linter/rules/use-vue-next-tick-promise/javascript) [(nursery)](https://biomejs.dev/linter/#nursery)
- [noVueOptionsApi](https://biomejs.dev/linter/rules/no-vue-options-api/javascript)
- [useVueDefineMacrosOrder](https://biomejs.dev/linter/rules/use-vue-define-macros-order/javascript)
- [useVueMultiWordComponentNames](https://biomejs.dev/linter/rules/use-vue-multi-word-component-names/javascript) (recommended)
- [noVueArrowFuncInWatch](https://biomejs.dev/linter/rules/no-vue-arrow-func-in-watch/javascript) (recommended)
- [noVueVIfWithVFor](https://biomejs.dev/linter/rules/no-vue-v-if-with-v-for/html) (recommended)
- [useVueVForKey](https://biomejs.dev/linter/rules/use-vue-v-for-key/html) (recommended)
- [useVueValidTemplateRoot](https://biomejs.dev/linter/rules/use-vue-valid-template-root/html) (recommended)
- [useVueValidVBind](https://biomejs.dev/linter/rules/use-vue-valid-v-bind/html) (recommended)
- [useVueValidVCloak](https://biomejs.dev/linter/rules/use-vue-valid-v-cloak/html) (recommended)
- [useVueValidVElse](https://biomejs.dev/linter/rules/use-vue-valid-v-else/html) (recommended)
- [useVueValidVElseIf](https://biomejs.dev/linter/rules/use-vue-valid-v-else-if/html) (recommended)
- [useVueValidVHtml](https://biomejs.dev/linter/rules/use-vue-valid-v-html/html) (recommended)
- [useVueValidVIf](https://biomejs.dev/linter/rules/use-vue-valid-v-if/html) (recommended)
- [useVueValidVOn](https://biomejs.dev/linter/rules/use-vue-valid-v-on/html) (recommended)
- [useVueValidVOnce](https://biomejs.dev/linter/rules/use-vue-valid-v-once/html) (recommended)
- [useVueValidVPre](https://biomejs.dev/linter/rules/use-vue-valid-v-pre/html) (recommended)
- [useVueValidVText](https://biomejs.dev/linter/rules/use-vue-valid-v-text/html) (recommended)
- [noVueVOnNumberValues](https://biomejs.dev/linter/rules/no-vue-v-on-number-values/html) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useScopedStyles](https://biomejs.dev/linter/rules/use-scoped-styles/html) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useVueValidVFor](https://biomejs.dev/linter/rules/use-vue-valid-v-for/html) [(nursery)](https://biomejs.dev/linter/#nursery)
- [useVueVapor](https://biomejs.dev/linter/rules/use-vue-vapor/html)
- [useVueConsistentVBindStyle](https://biomejs.dev/linter/rules/use-vue-consistent-v-bind-style/html) (recommended)
- [useVueConsistentVOnStyle](https://biomejs.dev/linter/rules/use-vue-consistent-v-on-style/html) (recommended)
- [useVueHyphenatedAttributes](https://biomejs.dev/linter/rules/use-vue-hyphenated-attributes/html) (recommended)
