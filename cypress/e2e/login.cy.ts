describe("Login", () => {
  beforeEach(() => {
    cy.visitApp("/login")
  })

  it("loads login page with back link", () => {
    cy.contains("a", "Back to store").should("be.visible")
    cy.url().should("include", "/login")
  })

  it("returnTo query is respected after visit", () => {
    cy.visitApp("/login?returnTo=/cart")
    cy.url().should("include", "/login")
    cy.contains("Back to store").should("be.visible")
  })
})
