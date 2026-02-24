describe("Cart", () => {
  it("shows empty state when no items", () => {
    cy.visitApp("/cart")
    cy.contains("Your cart is empty").should("be.visible")
    cy.contains("Continue shopping").should("be.visible")
  })

  it("add product from home then cart shows item", () => {
    cy.visitApp("/")
    cy.get('button[aria-label="Add Box #14291 to cart"]').click()
    // Use desktop nav cart link so we stay in same session (cart state is in-memory)
    cy.get('[data-slot="top-bar"] a[href="/cart"]').click()
    cy.url().should("include", "/cart")
    cy.contains("Box #14291").should("be.visible")
    cy.contains("Your cart").should("be.visible")
  })

  it("Back to store link goes to home", () => {
    cy.visitApp("/cart")
    cy.contains("a", "Back to store").click()
    cy.url().should("eq", Cypress.config().baseUrl + "/")
  })
})
