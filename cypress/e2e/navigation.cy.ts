describe("Navigation", () => {
  beforeEach(() => {
    cy.visitApp("/")
  })

  it("cart link in nav goes to cart", () => {
    cy.get('[data-slot="top-bar"] a[href="/cart"]').click()
    cy.url().should("include", "/cart")
  })

  it("home link goes to store", () => {
    cy.visitApp("/cart")
    cy.get('a[href="/"]').first().click()
    cy.url().should("eq", Cypress.config().baseUrl + "/")
  })
})
