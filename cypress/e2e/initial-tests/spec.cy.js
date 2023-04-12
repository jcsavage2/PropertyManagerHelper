/// <reference types="cypress" />
// Welcome to Cypress!
//
// This spec file contains a variety of sample tests
// for a todo list app that are designed to demonstrate
// the power of writing tests in Cypress.
//
// To learn more about how Cypress works and
// what makes it such an awesome testing tool,
// please read our getting started guide:
// https://on.cypress.io/introduction-to-cypress
describe('Go to Home Page', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/work-order-chatbot')
  })
  it('Pro user identifies issue in one response', () => {
    cy.get('[data-testid="userMessageInput"]').type("Toilet is leaking from the tank, and the toilet is located in the upstairs bathroom on the right.")
    cy.get('[data-testid="send"]').click()
    cy.wait(5000)
    cy.get('[data-testid="response-1"]').should("contain", `Please complete the form below. When complete, and you have given permission to enter, click the "submit" button to send your Service Request.`)
  })
  it('Noob user gets a follow up question', () => {
    cy.get('[data-testid="userMessageInput"]').type("Toilet is broken.")
    cy.get('[data-testid="send"]').click()
    cy.wait(5000)
    cy.get('[data-testid="response-1"]').should("not.contain", `Please complete the form below. When complete, and you have given permission to enter, click the "submit" button to send your Service Request.`)
  })
})