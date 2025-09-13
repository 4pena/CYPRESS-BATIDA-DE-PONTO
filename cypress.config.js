const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        log(message) {
          console.log(message);
          return null;
        }
      });
    },
    chromeWebSecurity: false,
    downloadsFolder: 'cypress/downloads',
    trashAssetsBeforeRuns: true,
    // Configurações de timeout
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    requestTimeout: 10000,
    responseTimeout: 30000,
    // Configurações de viewport
    viewportWidth: 1280,
    viewportHeight: 720,
    // Configurações de video e screenshots
    video: true,
    screenshotOnRunFailure: true,
    screenshotsFolder: 'cypress/screenshots'
  },
});
