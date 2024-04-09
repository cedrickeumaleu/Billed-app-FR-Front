import { ROUTES_PATH } from "../constants/routes.js";
import { formatDate, formatStatus } from "../app/format.js";
import Logout from "./Logout.js";

export default class {
  constructor({ document, onNavigate, store, localStorage }) {
    this.document = document;
    this.onNavigate = onNavigate;
    this.store = store;
    const buttonNewBill = document.querySelector(
      `button[data-testid="btn-new-bill"]`
    );
    if (buttonNewBill)
      buttonNewBill.addEventListener("click", this.handleClickNewBill);
    const iconEyes = document.querySelectorAll(`div[data-testid="icon-eye"]`);
    // faire une vérification et s'assurer que iconEye est une NodeList non vide avant d'itérer dessus
    if (iconEyes.length > 0) {
      iconEyes.forEach((icon) => {
        icon.addEventListener("click", () => this.handleClickIconEye(icon));
      });
    }
    new Logout({ document, localStorage, onNavigate });
  }

  handleClickNewBill = () => {
    this.onNavigate(ROUTES_PATH["NewBill"]);
  };

  handleClickIconEye = (icon) => {
    const billUrl = icon.getAttribute("data-bill-url");

    //utilisation de querySelectorAll au lieu de $ pour sélectionner l'element (#modaleFile)
    const imgWidth = Math.floor(
      document.querySelector("#modaleFile").offsetWidth * 0.5
    );
    //création de la variable modaol et affichage
    const modalBody = document.querySelector("#modaleFile .modal-body");
    modalBody.innerHTML = `<div style='text-align: center;' class="bill-proof-container"><img width=${imgWidth} src=${billUrl} alt="Bill" /></div>`;
    $("#modaleFile").modal("show");
  };

  getBills = () => {
    if (this.store) {
      return this.store
        .bills()
        .list()
        .then((snapshot) => {
          const bills = snapshot.map((doc) => {
            try {
              return {
                ...doc,
                date: formatDate(doc.date),
                status: formatStatus(doc.status),
              };
            } catch (e) {
              // if for some reason, corrupted data was introduced, we manage here failing formatDate function
              // log the error and return unformatted date in that case
              console.log(e, "for", doc);
              return {
                ...doc,
                date: doc.date,
                status: formatStatus(doc.status),
              };
            }
          });

          // Trier les factures par date dans l'ordre décroissant
          bills.sort((a, b) => new Date(b.date) - new Date(a.date));

          console.log("length", bills.length);
          return bills;
        });
    }
  };
}
