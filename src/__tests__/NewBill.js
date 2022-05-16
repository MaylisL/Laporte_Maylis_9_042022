/**
 * @jest-environment jsdom
 */

import { getByRole, screen } from "@testing-library/dom"
import userEvent from '@testing-library/user-event'
import NewBillUI from "../views/NewBillUI.js"
import NewBill from "../containers/NewBill.js"
import {localStorageMock} from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store"

jest.mock("../app/store", () => mockStore)

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page and i click the submit button", () => {
    beforeEach(() => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee',
        email: 'test@test.test'
      }))

    })
    test("Then handlesubmit function should be called", () => {
      const html = NewBillUI()
      document.body.innerHTML = html

      const onNavigate = jest.fn()
      const store = null

      const newBillContainer = new NewBill({
        document, onNavigate, store, localStorage: window.localStorage
      })
      const newBillForm = screen.getByTestId('form-new-bill')
      const handleSubmit = jest.fn((e)=> newBillContainer.handleSubmit(e))
      
      newBillForm.addEventListener('submit', handleSubmit)
      userEvent.click(getByRole(document.body,'button'))
      
      expect(handleSubmit).toBeCalled()
    })
    test("Then updateBill should be called with filled up information", () => {
      const html = NewBillUI()
      document.body.innerHTML = html

      const onNavigate = jest.fn()
      const store = null

      const newBillContainer = new NewBill({
        document, onNavigate, store, localStorage: window.localStorage
      })
     
      newBillContainer.updateBill = jest.fn()
      const expectedBillFormData = {
        email: "test@test.test",
        type: "Services en ligne",
        amount: 100,
        commentary: "Test commentary",
        date: "1999-01-01",
        fileName: null,
        fileUrl: null,
        name: "test name",
        pct: 20,
        status: "pending",
        vat: "20"
      }

      // set form field values
      screen.getByTestId('amount').value = expectedBillFormData.amount
      screen.getByTestId('expense-name').value = expectedBillFormData.name
      screen.getByTestId('expense-type').value = expectedBillFormData.type
      screen.getByTestId('datepicker').value = expectedBillFormData.date
      screen.getByTestId('vat').value = expectedBillFormData.vat
      screen.getByTestId('pct').value = expectedBillFormData.pct
      screen.getByTestId('commentary').value = expectedBillFormData.commentary

      // trigger submit
      userEvent.click(getByRole(document.body,'button'))
      
      expect(newBillContainer.updateBill).toHaveBeenCalledTimes(1)
      expect(newBillContainer.updateBill).toHaveBeenCalledWith(expectedBillFormData)
      
    })
  })
  describe("When I am on NewBill Page and i upload any file", () => {
    test("Then handleChangeFile is called", () => {
      const html = NewBillUI()
      document.body.innerHTML = html

      const onNavigate = jest.fn()
      const store = null

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee',
        email: 'test@test.test'
      }))

      const newBillContainer = new NewBill({
        document, onNavigate, store, localStorage: window.localStorage
      })

      const handleChangeFile = jest.fn((e) => newBillContainer.handleChangeFile(e))
      const fileInput = screen.getByTestId('file')

      fileInput.addEventListener('change', handleChangeFile)
      userEvent.upload(fileInput,'test')

      expect(handleChangeFile).toHaveBeenCalled();
    })
  })
  describe("When I am on NewBill Page and i upload an incorrect format file", () => {
    test("Then Store does NOT POST file", async () => {
      jest.spyOn(mockStore, "bills")
      jest.clearAllMocks()
      const html = NewBillUI()
      document.body.innerHTML = html

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee',
        email: 'test@test.test'
      }))

      const newBillContainer = new NewBill({
        document, onNavigate: jest.fn(), store: mockStore, localStorage: window.localStorage
      })

      const mockBadFormatFileChangeEvent = {
        type: 'change',
        target: {
          value: 'mock\\path\\to\\fake-file.txt'
        },
        preventDefault: jest.fn()
      }
      newBillContainer.handleChangeFile(mockBadFormatFileChangeEvent);
      expect(newBillContainer.fileName).toBe(null);
      expect(newBillContainer.billId).toBe(null)
      expect(mockStore.bills).not.toHaveBeenCalled();
    })
  })
  describe("When I am on NewBill Page and i upload a correct format file", () => {
    test("Then store creates file", async () => {
      jest.spyOn(mockStore, "bills")
      jest.clearAllMocks()
      mockStore.bills.mockImplementationOnce(() => {
        return {
          create : () =>  {
            return Promise.resolve({
              fileUrl: 'mock\\path\\to\\fake-image.jpg', 
              key: 'mockKey'
            })
          }
      }})
      const html = NewBillUI()
      document.body.innerHTML = html

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee',
        email: 'test@test.test'
      }))

      const newBillContainer = new NewBill({
        document, onNavigate: jest.fn(), store: mockStore, localStorage: window.localStorage
      })

      const mockCorrectFileChangeEvent = {
        type: 'change',
        target: {
          value: 'mock\\path\\to\\fake-image.jpg'
        },
        preventDefault: jest.fn()
      }

      newBillContainer.handleChangeFile(mockCorrectFileChangeEvent);
      
      await new Promise(process.nextTick);
      
      expect(newBillContainer.fileName).toBe('fake-image.jpg');
      expect(newBillContainer.billId).toBe('mockKey')
      expect(mockStore.bills).toHaveBeenCalled();
    })
  })
  describe("When and error occurs on API", () => {
    beforeEach(() => {
      Object.defineProperty(
        window,
        'localStorage',
        { value: localStorageMock }
      )
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee',
        email: 'test@test.test'
      }))
      jest.spyOn(mockStore, "bills")
      jest.spyOn(console, "error")
      jest.clearAllMocks();
    })
    test("Then bills POST file fails with 404 error", async () => {
      const mock404Error = new Error("Erreur 404")
      mockStore.bills.mockImplementationOnce(() => {
        return {
          create : () =>  {
            return Promise.reject(mock404Error)
          }
      }})
      const html = NewBillUI()
      document.body.innerHTML = html
      const onNavigate = jest.fn()
      const store = mockStore
      
      const newBillContainer = new NewBill({
        document, onNavigate, store, localStorage: window.localStorage
      })

      const mockCorrectFileChangeEvent = {
        type: 'change',
        target: {
          value: 'mock\\path\\to\\fake-image.jpg'
        },
        preventDefault: jest.fn()
      }
      newBillContainer.handleChangeFile(mockCorrectFileChangeEvent);
      await new Promise(process.nextTick);
      expect(mockStore.bills).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledTimes(1)
      expect(console.error).toHaveBeenCalledWith(mock404Error)

    })
    test("Then bills POST file fails with 500 error", async () => {
      const mock500Error = new Error("Erreur 500")
      mockStore.bills.mockImplementationOnce(() => {
        return {
          create : () =>  {
            return Promise.reject(mock500Error)
          }
      }})
      const html = NewBillUI()
      document.body.innerHTML = html
      const onNavigate = jest.fn()
      const store = mockStore
      
      const newBillContainer = new NewBill({
        document, onNavigate, store, localStorage: window.localStorage
      })

      const mockCorrectFileChangeEvent = {
        type: 'change',
        target: {
          value: 'mock\\path\\to\\fake-image.jpg'
        },
        preventDefault: jest.fn()
      }
      newBillContainer.handleChangeFile(mockCorrectFileChangeEvent);
      await new Promise(process.nextTick);
      expect(mockStore.bills).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledTimes(1)
      expect(console.error).toHaveBeenCalledWith(mock500Error)
    })
  })
})
