import { ROUTES_PATH } from "../constants/routes.js";

export let PREVIOUS_LOCATION = "";

export default class Login {
  constructor({
    document,
    localStorage,
    onNavigate,
    store,
    PREVIOUS_LOCATION,
  }) {
    this.document = document;
    this.localStorage = localStorage;
    this.onNavigate = onNavigate;
    this.store = store;
    this.PREVIOUS_LOCATION = PREVIOUS_LOCATION;
    const formEmployee = this.document.querySelector(
      `form[data-testid="form-employee"]`
    );
    formEmployee.addEventListener("submit", this.handleSubmitEmployee);
    const formAdmin = this.document.querySelector(
      `form[data-testid="form-admin"]`
    );
    formAdmin.addEventListener("submit", this.handleSubmitAdmin);
  }

  handleSubmitEmployee = (e) => {
    e.preventDefault();
    const user = {
      type: "Employee",
      email: e.target.querySelector(`input[data-testid="employee-email-input"]`)
        .value,
      password: e.target.querySelector(
        `input[data-testid="employee-password-input"]`
      ).value,
      status: "connected",
    };
    this.localStorage.setItem("user", JSON.stringify(user));
    this.login(user)
      .catch((err) => this.createUser(user))
      .then(() => {
        this.onNavigate(ROUTES_PATH["Bills"]);
        this.PREVIOUS_LOCATION = ROUTES_PATH["Bills"];
        document.body.style.backgroundColor = "#fff";
      });
  };

  //dorection sur les route
  handleSubmitAdmin = (e) => {
    e.preventDefault();
    const user = {
      type: "Admin",
      email: e.target.querySelector(`input[data-testid="admin-email-input"]`)
        .value,
      password: e.target.querySelector(
        `input[data-testid="admin-password-input"]`
      ).value,
      status: "connected",
    };
    this.localStorage.setItem("user", JSON.stringify(user));
    this.login(user)
      .catch((err) => this.createUser(user))
      .then(() => {
        this.onNavigate(ROUTES_PATH["Dashboard"]);
        this.PREVIOUS_LOCATION = ROUTES_PATH["Dashboard"];
        this.document.body.style.backgroundColor = "#fff";
      });
  };

  login = (user) => {
    if (this.store) {
      return this.store
        .login(
          JSON.stringify({
            email: user.email,
            password: user.password,
          })
        )
        .then(({ jwt }) => {
          this.localStorage.setItem("jwt", jwt);
        });
    } else {
      return null;
    }
  };

  createUser = (user) => {
    if (this.store) {
      return this.store
        .users()
        .create({
          data: JSON.stringify({
            type: user.type,
            name: user.email.split("@")[0],
            email: user.email,
            password: user.password,
          }),
        })
        .then(() => {
          console.log(`User with ${user.email} is created`);
          return this.login(user);
        });
    } else {
      return null;
    }
  };
}
