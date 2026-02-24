describe("Home / Store", () => {
  beforeEach(() => {
    cy.visitApp("/")
  })

  it("loads the store and shows hero and sections", () => {
    cy.contains("Shop the collection").should("be.visible")
    cy.contains("Bestsellers").should("be.visible")
    cy.contains("New arrivals").should("be.visible")
    cy.contains("Premium").should("be.visible")
  })

  it("Shop now scrolls to bestsellers", () => {
    cy.contains("a", "Shop now").click()
    cy.get("#bestsellers").should("be.visible")
  })

  it("shows product cards with add-to-cart", () => {
    cy.get("#bestsellers").scrollIntoView()
    cy.get('button[aria-label^="Add "]', { timeout: 10000 }).should("have.length.at.least", 1)
    cy.contains("Box #14291", { timeout: 10000 }).should("be.visible")
  })
})
