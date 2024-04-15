import { ROUTES_PATH } from "../constants/routes.js";
import Logout from "./Logout.js";

export default class NewBill {
  //utilisation d'un stockage local
  constructor({ document, onNavigate, store, localStorage }) {
    this.document = document;
    this.onNavigate = onNavigate;
    this.store = store;
    this.localStorage = localStorage;
    this.billDataKey = "newBillData"; // Clé pour stocker les données du formulaire dans le localStorage

    const formNewBill = this.document.querySelector(
      `form[data-testid="form-new-bill"]`
    );
    formNewBill.addEventListener("submit", this.handleSubmit);
    const fileInput = this.document.querySelector(`input[data-testid="file"]`);
    fileInput.addEventListener("change", this.handleChangeFile);
    this.fileUrl = null;
    this.fileName = null;
    this.billId = null;
    new Logout({ document, localStorage, onNavigate });

    // Charger les données du formulaire depuis le localStorage s'il y en a
    const savedBillData = this.localStorage.getItem(this.billDataKey);
    if (savedBillData) {
      const { formData, fileUrl, fileName, billId } = JSON.parse(savedBillData);
      this.fileUrl = fileUrl;
      this.fileName = fileName;
      this.billId = billId;
      this.populateForm(formData);
    }
  }

  //gestion du changement de fichier
  handleChangeFile = (e) => {
    e.preventDefault();
    //modification de la variable file en fileInput et création d'un nouvelle variable file
    const fileInput = this.document.querySelector(`input[data-testid="file"]`);
    const file = fileInput.files[0];

    // Vérification si un fichier a été sélectionné
    if (!file) {
      console.error("Aucun fichier sélectionné.");
      return;
    }

    // test de l'extension du fichier
    const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
    const fileName = file.name;
    const fileExtension = fileName.split(".").pop().toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      console.error("L'extension du fichier n'est pas autorisée.");
      return;
    }

    // Si l'extension est valide, continuer le traitement
    const formData = new FormData();
    const email = JSON.parse(localStorage.getItem("user")).email;
    formData.append("file", file);
    formData.append("email", email);

    this.store
      .bills()
      .create({
        data: formData,
        headers: {
          noContentType: true,
        },
      })
      .then(({ fileUrl, key }) => {
        console.log(fileUrl);
        this.billId = key;
        this.fileUrl = fileUrl; // Stocker l'URL de l'image
        this.fileName = fileName;
      })
      .catch((error) => console.error(error));
  };

  //gestion de la soumissin du formulaire
  handleSubmit = async (e) => {
    e.preventDefault();

    const email = JSON.parse(localStorage.getItem("user")).email;
    const form = e.target;
    const bill = {
      email,
      type: form.querySelector(`select[data-testid="expense-type"]`).value,
      name: form.querySelector(`input[data-testid="expense-name"]`).value,
      amount: parseInt(form.querySelector(`input[data-testid="amount"]`).value),
      date: form.querySelector(`input[data-testid="datepicker"]`).value,
      vat: form.querySelector(`input[data-testid="vat"]`).value,
      pct: parseInt(form.querySelector(`input[data-testid="pct"]`).value) || 20,
      commentary: form.querySelector(`textarea[data-testid="commentary"]`)
        .value,
      fileUrl: this.fileUrl, // Utiliser l'URL de l'image stockée
      fileName: this.fileName,
      status: "pending",
    };

    try {
      await this.updateBill(bill);
      // Rediriger vers la page précédente
      window.history.href = document.referrer;
    } catch (error) {
      console.error(error);
    }
  };

  // Mise à jour de la facture
  updateBill = async (bill) => {
    if (this.store) {
      try {
        await this.store.bills().update({
          data: JSON.stringify(bill),
          selector: this.billId,
        });
        this.onNavigate(ROUTES_PATH["Bills"]);
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  };

  populateForm(formData) {
    // Remplir le formulaire avec les données du localStorage
    const { type, name, amount, date, vat, pct, commentary } = formData;
    const form = this.document.querySelector(
      `form[data-testid="form-new-bill"]`
    );
    form.querySelector(`select[data-testid="expense-type"]`).value = type;
    form.querySelector(`input[data-testid="expense-name"]`).value = name;
    form.querySelector(`input[data-testid="amount"]`).value = amount;
    form.querySelector(`input[data-testid="datepicker"]`).value = date;
    form.querySelector(`input[data-testid="vat"]`).value = vat;
    form.querySelector(`input[data-testid="pct"]`).value = pct;
    form.querySelector(`textarea[data-testid="commentary"]`).value = commentary;

    // Assurez-vous que l'URL de l'image est correctement attribuée à l'élément HTML approprié
    if (this.fileUrl) {
      const imageElement = form.querySelector(
        `img[data-testid="uploaded-image"]`
      );
      if (imageElement) {
        imageElement.src = this.fileUrl;
      }
    }
  }

  extractFormData() {
    // Extraire les données du formulaire
    const form = this.document.querySelector(
      `form[data-testid="form-new-bill"]`
    );
    return {
      type: form.querySelector(`select[data-testid="expense-type"]`).value,
      name: form.querySelector(`input[data-testid="expense-name"]`).value,
      amount: parseInt(form.querySelector(`input[data-testid="amount"]`).value),
      date: form.querySelector(`input[data-testid="datepicker"]`).value,
      vat: form.querySelector(`input[data-testid="vat"]`).value,
      pct: parseInt(form.querySelector(`input[data-testid="pct"]`).value) || 20,
      commentary: form.querySelector(`textarea[data-testid="commentary"]`)
        .value,
    };
  }

  saveFormDataToLocalStorage(formData) {
    // Sauvegarder les données du formulaire dans le localStorage
    this.localStorage.setItem(
      this.billDataKey,
      JSON.stringify({
        formData,
        fileUrl: this.fileUrl,
        fileName: this.fileName,
        billId: this.billId,
      })
    );
  }

  handleBeforeUnload = (e) => {
    // Gestion de l'événement beforeunload pour sauvegarder les données du formulaire avant de quitter la page
    const formData = this.extractFormData();
    this.saveFormDataToLocalStorage(formData);
  };
}
