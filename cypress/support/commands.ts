const WELCOME_DISMISSED_KEY = "descope-b2c-welcome-dismissed"

/**
 * Visit a path with the welcome popup pre-dismissed (localStorage set before load).
 * Use this instead of cy.visit() so the welcome dialog doesn't block interaction.
 */
Cypress.Commands.add("visitApp", (path: string, options?: object) => {
  cy.visit(path, {
    ...options,
    onBeforeLoad(win: Window) {
      win.localStorage.setItem(WELCOME_DISMISSED_KEY, "true")
    },
  })
})
