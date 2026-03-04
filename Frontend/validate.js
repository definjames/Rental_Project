document.getElementById("registerForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  // Inputs
  let userid = document.getElementById("userid").value.trim();
  let password = document.getElementById("pass").value.trim();
  let name = document.getElementById("name").value.trim();
  let address = document.getElementById("address")?.value.trim() || '';
  let country = document.getElementById("country").value;
  let zip = document.getElementById("zip").value.trim();
  let email = document.getElementById("email").value.trim();
  let sex = document.querySelector('input[name="sex"]:checked');
  let rental = document.querySelector('input[name="rental"]:checked');
  let eng = document.getElementById("eng").checked;
  let noneng = document.getElementById("noneng").checked;
  let about = document.getElementById("about")?.value.trim() || '';

  // Error elements
  let useridError = document.getElementById("useridError");
  let passError = document.getElementById("passError");
  let nameError = document.getElementById("nameError");
  let countryError = document.getElementById("countryError");
  let zipError = document.getElementById("zipError");
  let emailError = document.getElementById("emailError");
  let sexError = document.getElementById("sexError");
  let rentalError = document.getElementById("rentalError");
  let langError = document.getElementById("langError");

  // Clear errors
  document.querySelectorAll(".error").forEach(el => el.innerHTML = "");

  let valid = true;

  // USER ID
  if (userid === "") {
    useridError.innerHTML = "User ID is required";
    valid = false;
  } else if (userid.length < 5 || userid.length > 12) {
    useridError.innerHTML = "User ID must be 5–12 characters";
    valid = false;
  }

  // PASSWORD
  if (password === "") {
    passError.innerHTML = "Password is required";
    valid = false;
  } else if (password.length < 7 || password.length > 12) {
    passError.innerHTML = "Password must be 7–12 characters";
    valid = false;
  }

  // NAME
  if (name === "") {
    nameError.innerHTML = "Name is required";
    valid = false;
  }

  // COUNTRY
  if (country === "") {
    countryError.innerHTML = "Please select a country";
    valid = false;
  }

  // ZIP
  let zipPattern = /^[0-9]{6}$/;
  if (zip === "") {
    zipError.innerHTML = "ZIP Code is required";
    valid = false;
  } else if (!zipPattern.test(zip)) {
    zipError.innerHTML = "ZIP Code must be exactly 6 digits";
    valid = false;
  }

  // EMAIL
  let emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email === "") {
    emailError.innerHTML = "Email is required";
    valid = false;
  } else if (!emailPattern.test(email)) {
    emailError.innerHTML = "Invalid email";
    valid = false;
  }

  // SEX
  if (!sex) {
    sexError.innerHTML = "Select gender";
    valid = false;
  }

  // LANGUAGE
  if (!eng && !noneng) {
    langError.innerHTML = "Select at least one language";
    valid = false;
  }

  // RENTAL
  if (!rental) {
    rentalError.innerHTML = "Select rental option";
    valid = false;
  }

  if (valid) {
    // send to backend
    const payload = {
      userid,
      password,
      name,
      address,
      country,
      zip,
      email,
      sex: sex ? sex.value : '',
      rental: rental ? rental.value : '',
      languages: [ ...(eng ? ['English'] : []), ...(noneng ? ['Non-English'] : []) ],
      about,
    };
    try {
      // auth.js defines registerApi helper
      const resp = await registerApi(payload);
      alert('Registration successful, please login');
      document.getElementById('registerForm').reset();
      location.href = 'login.html';
    } catch (err) {
      console.error('registration error', err);
      alert('Registration failed: ' + (err.error || 'server error'));
    }
  }
});
