/**
 * @jest-environment jsdom
 */

// Import des bibliothèques et modules nécessaires
import "@testing-library/jest-dom"; //import de l'extension jest
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes";
import { localStorageMock } from "../__mocks__/localStorage.js";
import { bills } from "../fixtures/bills.js";
import mockedStore from "../__mocks__/store.js";
import router from "../app/Router.js";

// Mock du module Store
jest.mock("../app/Store.js", () => mockedStore);

// Suite de tests sur un utilisateur connecté en tan qu'employé
describe("Étant donné que je suis connecté en tant qu'employé", () => {
  // Suite de tests pour la page de création de facture
  describe("Quand je suis sur la page NewBill", () => {
    test("Alors, le formulaire NewBill devrait être affiché", async () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ type: "Employee", email: "a@a" })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.NewBill);

      await waitFor(() => screen.getByText("Envoyer une note de frais"));
      const formData = screen.getAllByTestId("form-new-bill");

      expect(formData).toBeTruthy();
    });
  });

  // Suite de tests pour le remplissage des champs et la soumission du formulaire de création de facture
  describe("Quand je suis sur la page NewBill et que je remplis les champs pour soumettre le formulaire", () => {
    // Initialisation des variables nécessaires aux tests
    let billForm,
      expenseTypeInput,
      datePickerInput,
      amountInput,
      pctInput,
      fileInput,
      fileInputLabel,
      file,
      billData;

    beforeAll(() => {
      billData = bills[0];
      file = new File(["test"], billData.fileName, { type: "image/jpeg" });
    });

    beforeEach(() => {
      // Mise en place du HTML pour la page de création de facture
      const html = NewBillUI();
      document.body.innerHTML = html;

      // Récupération des éléments du formulaire
      billForm = screen.getByTestId("form-new-bill");
      expenseTypeInput = screen.getByTestId("expense-type");
      datePickerInput = screen.getByTestId("datepicker");
      amountInput = screen.getByTestId("amount");
      pctInput = screen.getByTestId("pct");
      fileInput = screen.getByTestId("file");
      fileInputLabel = screen.getByLabelText(/Justificatif/i);
    });

    //restauration du contenu html
    afterEach(() => {
      document.body.innerHTML = "";
    });

    // Vérifie qu'aucune erreur n'est affichée si tous les champs requis sont remplis
    test("Alors, aucune erreur ne devrait s'afficher afin que tous les champs obligatoires soient remplis", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));

      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };
      // Instanciation de la page de création de facture
      const emulatedNewBill = new NewBill({
        document,
        onNavigate,
        store: mockedStore,
        localStorage,
      });
      billForm.addEventListener("submit", emulatedNewBill.handleSubmit);

      // Remplissage des champs du formulaire
      fireEvent.change(expenseTypeInput, { target: { value: billData.type } });
      fireEvent.change(datePickerInput, { target: { value: billData.date } });
      fireEvent.change(amountInput, { target: { value: billData.amount } });
      fireEvent.change(pctInput, { target: { value: billData.pct } });
      userEvent.upload(fileInputLabel, file);

      // Vérification que les champs sont valides et que le fichier a été téléchargé
      expect(expenseTypeInput).toBeValid();
      expect(datePickerInput).toBeValid();
      expect(amountInput).toBeValid();
      expect(pctInput).toBeValid();
      expect(fileInput.files[0]).toBeTruthy();

      // Soumission du formulaire
      fireEvent.submit(billForm);

      expect(screen.getByText("Mes notes de frais")).toBeTruthy();
    });
  });
});

describe("Étant donné que je suis un utilisateur connecté en tant qu'employé", () => {
  let fileInput, onNavigate, emulatedNewBill;

  beforeEach(() => {
    // Mock du module Store
    jest.spyOn(mockedStore, "bills");
    // Simule la connexion d'un utilisateur de type "Employee"
    Object.defineProperty(window, "localStorage", { value: localStorageMock });
    window.localStorage.setItem(
      "user",
      JSON.stringify({
        type: "Employee",
        email: "a@a",
      })
    );
    const html = NewBillUI();
    document.body.innerHTML = html;
    onNavigate = (pathname) => {
      document.body.innerHTML = ROUTES({ pathname });
    };
    fileInput = screen.getByTestId("file");

    emulatedNewBill = new NewBill({
      document,
      onNavigate,
      store: mockedStore,
      localStorage,
    });
    fileInput.addEventListener("change", emulatedNewBill.handleChangeFile);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    jest.restoreAllMocks();
  });

  // tests d'intégration pour l'envoi des données de la facture à l'API en fonction du type de fichier d'image
  describe("Quand je navigue vers la page NewBill", () => {
    test("Alors la facture ne doit pas être POST sur API si le fichier de preuve n'est pas une image", async () => {
      const file = new File(["test"], "test.pdf", { type: "application/pdf" }); // fichier pdf
      userEvent.upload(fileInput, file, { applyAccept: false });

      await waitFor(() => expect(emulatedNewBill.fileUrl).toBeNull());
      await waitFor(() => expect(emulatedNewBill.billId).toBeNull());
    });

    // si le fichier correspond à une image evoie
    test("Alors la facture doit être POST sur API si le fichier de preuve est une image", async () => {
      const file = new File(
        ["test"],
        "https://localhost:3456/images/test.jpg",
        { type: "image/jpeg" } //fichier jpeg
      );
      userEvent.upload(fileInput, file);

      await waitFor(() =>
        expect(emulatedNewBill.fileUrl).toBe(
          "https://localhost:3456/images/test.jpg"
        )
      );
      await waitFor(() => expect(emulatedNewBill.billId).toBe("1234"));
    });
  });

  // suite de test sur lAPI
  describe("Quand une erreur se produit sur l'API", () => {
    let file;

    beforeEach(() => {
      console.error = jest.fn();
      file = new File(["test"], "https://localhost:3456/images/test.jpg", {
        type: "image/jpeg",
      });
    });

    test(" Alors, POST la facture sur l'API et échoue avec une erreur de message 400", async () => {
      mockedStore.bills.mockImplementationOnce(() => {
        return {
          create: jest.fn().mockRejectedValue(new Error("Erreur 400")),
        };
      });
      userEvent.upload(fileInput, file);
      await new Promise(process.nextTick);

      expect(`${console.error.mock.calls[0][0]}`).toContain("Erreur 400");
    });

    test("Alors, POST la facture sur l'API et échoue avec une erreur de message 500", async () => {
      mockedStore.bills.mockImplementationOnce(() => {
        return {
          create: jest.fn().mockRejectedValue(new Error("Erreur 500")),
        };
      });
      userEvent.upload(fileInput, file);
      await new Promise(process.nextTick);

      expect(`${console.error.mock.calls[0][0]}`).toContain("Erreur 500");
    });
  });
});
