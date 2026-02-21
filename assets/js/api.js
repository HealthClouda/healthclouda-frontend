// This API is to submit the contact form data to the server

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact");

  form.addEventListener("submit", async function(e) {
    e.preventDefault();

    const formData = {
      first_name: document.getElementById("first_name").value.trim(),
      last_name: document.getElementById("last_name").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone_number: document.getElementById("phone_number").value.trim(),
      message: document.getElementById("message").value.trim()
    };

    try {
      const response = await fetch("http://localhost:8000/api/contact-form/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const result = await response.json();
      alert("Message sent successfully!");
      console.log("Server response:", result);

      form.reset(); // clear form after success
    } catch (error) {
      console.error("Submit error:", error);
      alert("There was an error sending your message. Kindly refresh the page!");
    }
  });
});