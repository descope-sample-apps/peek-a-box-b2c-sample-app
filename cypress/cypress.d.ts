declare namespace Cypress {
  interface Chainable {
    /**
     * Visit a path with the welcome popup pre-dismissed.
     * @example cy.visitApp('/') cy.visitApp('/cart')
     */
    visitApp(path: string, options?: object): Chainable<null>
  }
}
