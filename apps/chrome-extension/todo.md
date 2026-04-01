Based on the learning from creating a project from scratch, all the changes/learnings should be added back to skill
1. for i18n, create json instead of yaml, to avoid needing a custom parser
2. Use nuxtui 4.6.0, always use the latest version of nuxtui to get the latest features and bug fixes
3. Add tests for the extension, including unit tests with Vitest and E2E tests with Playwright
4. The app structure should adopt src folder convention
5. main.css should be inside /assets folder and not inside /assets/css
6. For all libs, use the latest version.
7. wxt config is missing any details. because of this project is not building.
8. no base icon found at assets/icon.png, fix this, it should include both svg and png. . Also in the extension, lot of relevant places logo is not being used.
9. Add lint and run lint and test before build and zip commands
10. Add gitginore
11. Add a README with instructions on how to run and build the extension, as well as an overview of the project structure and available scripts.
12. Add nuxtui <UColorModeSelect /> and <ULocaleSelect /> components to the options page for easy theme and language switching.
13. Similarly, you have not used all the nuxtui components in the extension, you should use them wherever possible to maintain consistency and save development time. add reference in the skill for nuxtui completely.
14. Where ever you are using app tilte in the extension, you should use logo with it and not some icon
15. Add custom theme colors which can be customised by developer later, so the config exits
16. The Nuxtui components implementations have params and other from nuxtui olde version, fix this asweell
17. Lot of places, app name is hardcoded, it should be dynamic and taken from i18n locale file. ALso make sure all text and labels are localized.
18. The Common components like <UHeader> <UFooter>, <UContainer>, <UError>, <UMain> and all other components are not properly used.
19. For all App.vue, there was this background color, i removed it, you should remove it from all the places, and make sure the theme colors are used properly.
20. For the buttons and other components, you should use the theme colors instead of hardcoding the colors, this way it will be consistent and also can be easily changed by changing the theme colors
21. Add proper error handling and loading states in the extension, this will improve the user experience and also make the extension more robust.
22. Add proper documentation for the extension, including how to run, build, and test the extension, as well as an overview of the project structure and available scripts.
23. Avoid custom styles and use the nuxtui components and theme colors as much as possible, this will maintain consistency and also save development time.
24. const colorMode = useColorMode() should be completely removed, and instead you should use the <UColorModeSelect /> component from nuxtui, this will handle the theme switching for you and also save development time.
25.  you are using app name and logo but ideally <UHeader> should be used.
26. For the i18n, you should use the <ULocaleSelect /> component from nuxtui, this will handle the language switching for you and also save development time.
27. For sidebar, the footer should be used <UFooter> and for the main content <UMain> should be used, this will maintain consistency and also save development time.
28. you just added <ULocaleSelect but didnt implemet necessary changes for it work properly
