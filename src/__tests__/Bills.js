/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import BillsUI from "../views/BillsUI.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import { formatDate } from "../app/format.js";
import Bills from "../containers/Bills.js";
import mockedStore from "../__mocks__/store.js";
import { bills } from "../fixtures/bills.js";
import router from "../app/Router.js";

jest.mock("../app/Store.js", () => mockedStore);

//initialise l'environement de test et definir une fausse instance de localstorage
//contenant un utilisateur de type employé
describe("Given I am connected as an employee", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", { value: localStorageMock });
    window.localStorage.setItem(
      "user",
      JSON.stringify({
        type: "Employee",
      })
    );
  });

  //après chaque test nettoie le contenu du corps dudocument Html
  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("When I am on Bills Page", () => {
    //vérifie que l'icone de la fenêtre est présente sur la page des factures
    test("Then bill icon in vertical layout should be highlighted", async () => {
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      //to-do write expect expression
      expect(windowIcon).toBeTruthy();
    });

    //vérifie que les facture sont triées de la plus ancienne à la plus recente
    test("Then bills should be ordered from earliest to latest", async () => {
      const emulatedBills = await new Bills({
        document,
        onNavigate,
        store: mockedStore,
        localStorage,
      }).getBills();

      document.body.innerHTML = BillsUI({ data: emulatedBills });

      const displayedDate = screen
        .getAllByTestId("bill-date")
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a.date < b.date ? 1 : -1);
      const mockedSortDate = bills
        .sort(antiChrono)
        .map((a) => formatDate(a.date));

      expect(displayedDate).toStrictEqual(mockedSortDate);
    });
  });

  //vérifie si l'utilisateur clique sur l'iône d'oeil d'une facture
  describe("When I am on Bills page and I click on the eye icon", () => {
    //vérifie que la function handleClickIconeEye est appelée et qu'une modale s'ouvre avec le justificatif de la facture
    test("Then callback handleClickIconEye should be called and a modale should be open", () => {
      document.body.innerHTML = BillsUI({ data: bills });

      const emulatedBills = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });

      const iconEye = screen.getAllByTestId("icon-eye");
      $.fn.modal = jest.fn();
      const handleClickIconEye = jest.fn(emulatedBills.handleClickIconEye);
      iconEye.forEach((icon) => {
        icon.addEventListener("click", handleClickIconEye(icon));
        userEvent.click(icon);
        expect(handleClickIconEye).toHaveBeenCalled();

        const modale = screen.getByText("Justificatif");
        expect(modale).toBeTruthy();
      });
    });
  });

  // vérifie que lorsque l'utilisateur click sur le bouton créer une nouvelle facture, la page s'affiche
  describe("When I am on Bills page and I click on new bill button", () => {
    test("Then the New Bill page should be displayed", () => {
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);

      new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      }).handleClickNewBill();

      const formNewBill = screen.getByTestId("form-new-bill");
      expect(formNewBill).toBeTruthy();
    });
  });
});

//test d'intégration GET Bills, liés à la gestion des erreur lors de la récupération des factures depuis l'Api
describe("Given I am a user connected as employee", () => {
  describe("When an error occurs on API", () => {
    beforeEach(() => {
      jest.spyOn(mockedStore, "bills");
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "a@a",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.appendChild(root);
      router();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    //vérifie les données des factures récupérées depuis l'Api sont corrompues,
    // affiche un message d'erreur dans la console.
    test("fetches bills from an API and send a message in console if data is corrupted", async () => {
      console.log = jest.fn();
      mockedStore.bills.mockImplementationOnce(() => {
        return {
          list: jest.fn().mockResolvedValue([{}]),
        };
      });

      window.onNavigate(ROUTES_PATH.Bills);
      await new Promise(process.nextTick);

      expect(`${console.log.mock.calls[0][0]}`).toEqual(
        "RangeError: Invalid time value"
      );
    });

    // vérifie que si une erreur 404 est renvoyée par l'Api lors de la récupération des facture,
    // une méssage d'erreur est afficher à l'utilisateru
    test("fetches bills from an API and fails with 404 message error", async () => {
      mockedStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 404"));
          },
        };
      });
      window.onNavigate(ROUTES_PATH.Bills);
      await new Promise(process.nextTick);

      const message = screen.getByText(/Erreur 404/);
      expect(message).toBeTruthy();
    });

    test("fetches bills from an API and fails with 500 message error", async () => {
      mockedStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 500"));
          },
        };
      });
      window.onNavigate(ROUTES_PATH.Bills);
      await new Promise(process.nextTick);

      const message = screen.getByText(/Erreur 500/);
      expect(message).toBeTruthy();
    });
  });
});
