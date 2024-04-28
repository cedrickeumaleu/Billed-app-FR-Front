/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom"; //import de l'extension jest
import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event"; //extension de @testing-library/dom
import BillsUI from "../views/BillsUI.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import { formatDate } from "../app/format.js";
import Bills from "../containers/Bills.js";
import mockedStore from "../__mocks__/store.js";
import { bills } from "../fixtures/bills.js";
import router from "../app/Router.js";

// simulation du store.js
jest.mock("../app/Store.js", () => mockedStore);

//initialisation de l'environement de test et definir une fausse instance de localstorage
//contenant un utilisateur de type employé
describe("Étant donné que je suis connecté en tant qu'employé", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", { value: localStorageMock });
    window.localStorage.setItem(
      "user",
      JSON.stringify({
        type: "Employee",
      })
    );
  });

  //je fais un (afterEach): après chaque test pour nettoie le contenu du corps dudocument Html
  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("quand je suis sur la page de fature", () => {
    test("Alors l'icône de la facture dans la dioposition verticale doit être mise en surbrillance", async () => {
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      //to-do write expect expression
      //assertion de vérification de valeur du test windowIcon ,selon les règles de coercition de JavaScript
      expect(windowIcon).toBeTruthy();
    });

    test("Alors, les factures doivent être classées du plus recent au plus ancien", async () => {
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

      //assertion pour vérifié si les valeur de (displaydDate) sont strictement égales
      expect(displayedDate).toStrictEqual(mockedSortDate);
    });
  });

  //je vérifie si l'utilisateur clique sur l'iône d'oeil d'une facture
  describe("Quand je suis sur la page Factures et que je clique sur l'icône en forme d'œil", () => {
    test("Alors, la function handleClickIconEye doit être appelé et un modale doit être ouvert", () => {
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

        // assertion de vérification si (handleClickIconEye) a été appelée au moins une fois
        expect(handleClickIconEye).toHaveBeenCalled();

        const modale = screen.getByText("Justificatif");
        expect(modale).toBeTruthy();
      });
    });
  });

  // vérifie si l'utilisateur click sur le bouton créer une nouvelle facture, la page s'affiche
  describe("Lorsque je suis sur la page Factures et que je clique sur le bouton Nouvelle facture", () => {
    test("Alors, la page Nouvelle facture devrait s'afficher", () => {
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
      //assertion qui vérifie si le (formNewBill) renvoie une valeur vraie
      expect(formNewBill).toBeTruthy();
    });
  });
});

//test d'intégration GET Bills, liés à la gestion des erreur lors de la récupération des factures depuis l'Api
describe("Étant donné que je suis un utilisateur connecté en tant qu'employé", () => {
  describe("Lorsqu'une erreur se produit sur l'API", () => {
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

    //restauration de tous les mocks crées pendant le test
    afterEach(() => {
      jest.restoreAllMocks();
    });

    //vérifie si les données des factures récupérées depuis l'Api sont corrompues,
    // et affiche un message d'erreur dans la console.
    test("Alors, récupère les factures depuis une Api et envoie un message dans la console si les données sont corrompues", async () => {
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

    // vérifie si une erreur 404 est renvoyée par l'Api lors de la récupération des facture,
    // et un méssage d'erreur est afficher à l'utilisateru
    test("Alors récupère les factures depuis l'Api et échoue avec un message d'erreur 404", async () => {
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

    // test sur une erreur 500
    test("Alors récupère les factures depuis l'Api et échoue avec un message d'erreur 500", async () => {
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
