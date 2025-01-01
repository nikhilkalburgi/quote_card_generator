const accessKey = '<UNSPLASH_ACCESS_KEY>';

// Function to wrap text based on the maximum width
function wrapText(context, text, maxWidth) {
  const words = text.split(' ');
  let lines = [];
  let currentLine = '';

  words.forEach((word) => {
    // Add the word to the current line
    const testLine = currentLine + word + ' ';
    const metrics = context.measureText(testLine);

    // If the line exceeds the max width, push the current line to lines and start a new line
    if (metrics.width > maxWidth) {
      lines.push(currentLine);
      currentLine = word + ' ';
    } else {
      currentLine = testLine;
    }
  });

  // Push the last line to lines array
  lines.push(currentLine);

  return lines;
}

function validateInputs() {
  // Get the input elements
  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const contact = document.getElementById('contact').value.trim();
  const statusMessage = document.getElementById('statusMessage');

  // Regular expressions for validation
  const nameRegex = /^[a-zA-Z\s]+$/; // Allows only alphabets and spaces
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const contactRegex = /^\d{10}$/; // Allows exactly 10 digits for contact

  // Validate Full Name
  if (!fullName) {
    statusMessage.innerHTML = 'Full Name is required.';
    return false;
  } else if (!nameRegex.test(fullName)) {
    statusMessage.innerHTML = 'Full Name should contain only alphabets and spaces.';
    return false;
  }

  // Validate Email
  if (!email) {
    statusMessage.innerHTML = 'Email is required.';
    return false;
  } else if (!emailRegex.test(email)) {
    statusMessage.innerHTML = 'Please enter a valid email address.';
    return false;
  }

  // Validate Contact
  if (!contact) {
    statusMessage.innerHTML = 'Contact is required.';
    return false;
  } else if (!contactRegex.test(contact)) {
    statusMessage.innerHTML = 'Contact should be a valid 10-digit number.';
    return false;
  }
  statusMessage.innerHTML = '';
  return true;
}

async function generateHmacSHA256Signature(message, secret) {
  // Convert the secret and message to Uint8Array
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  // Import the secret key
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  );

  // Generate the HMAC signature
  const signature = await crypto.subtle.sign('HMAC', key, messageData);

  // Convert the signature to a hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyPayment(orderId, razorpayPaymentId, razorpaySignature, secret) {
  const message = `${orderId}|${razorpayPaymentId}`;
  const generatedSignature = await generateHmacSHA256Signature(message, secret);
  if (generatedSignature === razorpaySignature) {
    return true
  } else {
    return false
  }
}

// Payment Gateway API
async function razorpayPaymentGateway(fullName, email, contact) {
  return new Promise(async (resolve, reject) => {
    try {
      const keyId = "KEY_ID"; // Replace with your Razorpay key_id
      const keySecret = "KEY_SECRET"; // Replace with your Razorpay key_secret
      const auth = btoa(`${keyId}:${keySecret}`); // Encode credentials for Basic Auth
    
      // Step 1: Create an order
      const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: 1000, // Amount in paise (₹10)
          currency: "INR"
        }),
      });
    
      if (!orderResponse.ok) {
        resolve({ success: false});
        return;
      }
    
      const order = await orderResponse.json();
    
      // Step 2: Open Razorpay Checkout
      const paymentOptions = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Kreative Bytes",
        description: "Transaction to Kreative Bytes",
        order_id: order.id, // Pass the order_id from the response
        handler: async function (response) {
          const result = await verifyPayment(order.id, response.razorpay_payment_id, response.razorpay_signature, keySecret)
          if(result) {
            resolve({success: true});
          } else {
            resolve({success: false});
          }
        },
        prefill: {
          name: fullName,
          email:email,
          contact: contact,
        },
        theme: {
          color: "#4CAF50",
        },
      };
    
      const razorpay = new window.Razorpay(paymentOptions);
      razorpay.open();

      razorpay.on('payment.failed', () => {
        resolve({ success: false});
      })
    } catch (error) {
      resolve({ success: false});
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {

  const generateCardBtn = document.getElementById("generateCard");
  const card = document.getElementById('card');
  const quota = document.getElementById('quota');
  const titleElement = document.getElementById('quoteText');
  const name = document.getElementById('name');
  const designation = document.getElementById('designation');
  const loader = document.getElementById('loading');
  const cardContent = document.getElementById('cardContent');
  const downloadCard = document.getElementById('downloadCard');
  const cardOptions = document.getElementById('cardOptions'); 
  const upgradeComponent = document.getElementById('upgradeComponent');
  const userInput = document.getElementById('userInput');
  const profileImage = document.getElementById('profileImage');
  const randomize = document.getElementById('randomize');
  const uploadImage = document.getElementById('imageUpload');
  const payButton = document.getElementById('payButton');
  const closeButton = document.getElementById("close-btn");
  const editButton = document.getElementById("edit-btn");
  const resetButton = document.getElementById("reset-btn");
  const dropdownButton = document.getElementById('dropdownButton');
  const dropdownMenu = document.getElementById('dropdownMenu');

  let dropdownValue= 'nature';

  const usageData = JSON.parse(localStorage.getItem('usage')) || {};
  const lastCheckTime = new Date(usageData.date);
  const currentTime = new Date();
  const timeDifference = (currentTime - lastCheckTime) / (1000 * 60 * 60); // Convert milliseconds to hours
  const options = { hour: 'numeric', minute: '2-digit', hour12: true, day: 'numeric', month: 'short', year: 'numeric' };

  if (timeDifference < 8 && usageData.unlimited) {
    const expiryTime = new Date(new Date(usageData.date).getTime() + 8 * 60 * 60 * 1000).toLocaleString('en-US', options);
    usageData.unlimited = false;
    upgradeComponent.children[0].innerHTML = '<strong>Thank you for upgrading!</strong>';
    upgradeComponent.children[1].innerHTML = `Your premium access will expire at <strong>${expiryTime}</strong>. <p style="font-size:14px; margin:0px; padding:0px;">Enjoy unlimited card generation until then!</p>`;
  }
  
  const state = JSON.parse(localStorage.getItem('state')) || null;
  if(state) {
    titleElement.classList.remove('hidden');
    name.classList.remove('hidden');
    designation.classList.remove('hidden');
    generateCardBtn.classList.add('hidden');
    userInput.classList.add('hidden');
    titleElement.innerText = state.title;
    name.innerText = state.name || 'Your name';
    designation.innerText = state.designation || 'Your designation';
    cardContent.style.background = `url(${state.background || 'default.webp'})`;
    profileImage.src = state.src || 'upload.jpg'
    card.classList.remove('hidden');
    loader.classList.add('hidden');
    cardContent.classList.remove('hidden');
    downloadCard.classList.remove('hidden');
    cardOptions.classList.remove('hidden');
  }

  generateCardBtn.addEventListener("click", async () => {

    if(!userInput.value) {
      userInput.style.borderColor= '#fa0814'
      userInput.style.boxShadow = '0 0 5px #fa0814';
      return;
    }else {
      userInput.style.borderColor= '#4CAF50'
      userInput.style.boxShadow = '0 0 5px #02ba36';
    }
  
    loader.classList.remove('hidden');
    card.classList.remove('hidden');
    generateCardBtn.classList.add('hidden');
    userInput.classList.add('hidden');
   
    if(!cardContent.classList.contains('hidden')) {
      cardContent.classList.add('hidden');
      downloadCard.classList.add('hidden');
      cardOptions.classList.add('hidden');
    }
    
    const options = { hour: 'numeric', minute: '2-digit', hour12: true, day: 'numeric', month: 'short', year: 'numeric' };
    const today = new Date().toLocaleString('en-US', options);
    const usageData = JSON.parse(localStorage.getItem('usage')) || {};
    const lastCheckTime = new Date(usageData.date);
    const currentTime = new Date();
    const timeDifference = (currentTime - lastCheckTime) / (1000 * 60 * 60); // Convert milliseconds to hours
  
    if (timeDifference >= 8) {
      usageData.unlimited = false;
      upgradeComponent.children[0].innerHTML = 'Generate up to 2 news cards for FREE!'
      upgradeComponent.children[1].innerHTML = '<a href="#" class="link">Upgrade</a> for just ₹10/- and enjoy unlimited access for the next 4 hours!'
    }
    
    // Quota exceeded
    if (new Date(usageData.date).toDateString() === new Date(today).toDateString() && usageData.clicks >= 2 && !usageData.unlimited) {
      card.classList.add('hidden');
      quota.classList.remove('hidden');
      upgradeComponent.classList.add('hidden');

      return;
    }

    fetch(`https://api.unsplash.com/photos/random?orientation=portrait&query=${dropdownValue}`, {
      headers: {
          Authorization: `Client-ID ${accessKey}`
      }
    })
    .then(response => response.json())
    .then(data => {
        // Use the image URL from the response
        const imageUrl = data.urls.regular;
        cardContent.style.background = `url(${imageUrl})`;
        titleElement.innerHTML = userInput.value;
        name.innerHTML = "Your name";
        designation.innerHTML = "Your designation";
        loader.classList.add('hidden');
        cardContent.classList.remove('hidden');
        downloadCard.classList.remove('hidden');
        cardOptions.classList.remove('hidden');
        // Update usage data
        if (new Date(usageData.date).toDateString() !== new Date(today).toDateString() ) {
          // Reset usage for a new day
          usageData.date = today;
          usageData.clicks = 0;
          usageData.unlimited = false;
        }
        usageData.clicks += 1;
        localStorage.setItem('usage', JSON.stringify(usageData));
        localStorage.setItem('state', JSON.stringify({title: titleElement.innerText, name: name.innerText, designation: designation.innerText, background: imageUrl, image: profileImage.src}));
    })
    .catch(error => {
      titleElement.innerHTML = userInput.value;
      name.innerHTML = "Your name";
      designation.innerHTML = "Your designation";
      loader.classList.add('hidden');
      cardContent.classList.remove('hidden');
      downloadCard.classList.remove('hidden');
      cardOptions.classList.remove('hidden');
      // Update usage data
      if (new Date(usageData.date).toDateString() !== new Date(today).toDateString() ) {
        // Reset usage for a new day
        usageData.date = today;
        usageData.clicks = 0;
        usageData.unlimited = false;
      }
      usageData.clicks += 1;
      localStorage.setItem('usage', JSON.stringify(usageData));
      localStorage.setItem('state', JSON.stringify({title: titleElement.innerText, name: name.innerText, designation: designation.innerText, background: '', image: profileImage.src}));
    });
  
  
  });

  downloadCard.addEventListener('click', function() {

    // Use html2canvas to capture the cardContent
    html2canvas(cardContent, {
        width: cardContent.offsetWidth,
        height: cardContent.offsetHeight,
        scale: 5, // Increase scale for better quality
        useCORS: true,
    }).then(canvas => {
        // Resize the canvas to 1080x1080
        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = 1080;
        resizedCanvas.height = document.getElementById('format1').checked ? 1080 : 1350;
        const ctx = resizedCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0, 1080, document.getElementById('format1').checked ? 1080 : 1350);

        // Convert the resized canvas to a data URL
        const dataURL = resizedCanvas.toDataURL('image/png');

        // Create a link element to download the image
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'quote-card.png';
        link.click();

        card.classList.add('hidden');
        cardContent.classList.add('hidden');
        downloadCard.classList.add('hidden');
        cardOptions.classList.add('hidden');
        loader.classList.remove('hidden');
        generateCardBtn.classList.remove('hidden');
        userInput.classList.remove('hidden');
        localStorage.removeItem('state');

    }).catch(error => {
        console.error('Error capturing the card:', error);
    });
  });

  // Simulated payment gateway integration
  payButton.addEventListener('click', async () => {

    if(!validateInputs()) {
      return;
    }

    const options = { hour: 'numeric', minute: '2-digit', hour12: true, day: 'numeric', month: 'short', year: 'numeric' };
    const today = new Date().toLocaleString('en-US', options);
    const expiryTime = new Date(new Date(today).getTime() + 4 * 60 * 60 * 1000).toLocaleString('en-US', options);
    
    try {
      // Fake API call to payment gateway
      const fullName = document.getElementById('fullName').value.trim();
      const email = document.getElementById('email').value.trim();
      const contact = document.getElementById('contact').value.trim();
      const paymentResponse = await razorpayPaymentGateway(fullName, email, contact);
      
      if (paymentResponse.success) {
        const usageData = JSON.parse(localStorage.getItem('usage')) || {};
        usageData.date = today;
        usageData.unlimited = true; // Unlimited access flag
        localStorage.setItem('usage', JSON.stringify(usageData));
        card.classList.add('hidden');
        quota.classList.add('hidden');
        generateCardBtn.classList.remove('hidden');
        cardOptions.classList.remove('hidden');
        upgradeComponent.children[0].innerHTML = '<strong>Thank you for upgrading!</strong>'
        upgradeComponent.children[1].innerHTML = `Your premium access will expire at <strong>${expiryTime}</strong>. <p style="font-size:14px; margin:0px; padding:0px;">Enjoy unlimited card generation until then!</p>`
        upgradeComponent.classList.remove('hidden');
        document.getElementById('lr-title').classList.remove('hidden');
        document.getElementById('lr-description').classList.remove('hidden');
      } else {
        card.classList.add('hidden');
        upgradeComponent.classList.add('hidden');
        statusMessage.textContent =
          "Payment failed. Please try again.";
      }
    } catch (error) {
      console.error(error);
      card.classList.add('hidden');
      upgradeComponent.classList.add('hidden');
      statusMessage.textContent =
        "An error occurred during payment. Please try again.";
    }
  });

  closeButton.addEventListener("click", () => {
    localStorage.removeItem('state');
    window.close(); // Closes the popup window
  });

  resetButton.addEventListener("click", () => {
    const state = JSON.parse(localStorage.getItem('state')) || null;

    if(state) {
      titleElement.innerText = state.title;
      name.innerText = state.name;
      designation.innerText = state.designation;
      cardContent.style.background = `url(${state.background || 'default.webp'})`;
      profileImage.src = state.image || 'upload.jpg';
    }
  });

  editButton.addEventListener("click", function () {
    const editBtn = this; // The edit button
  
    // Get all the editable elements (h1, p)
    const editableElements = cardContent.querySelectorAll("h1, p");
  
    if (editBtn.textContent === "✎") {
      // Switch to edit mode
      editableElements.forEach((element) => {
        element.setAttribute("contenteditable", "true");
        element.style.border = "1px dashed gray"; // Highlight editable elements
      });
  
      editBtn.textContent = "✔"; // Change button to confirm mode
      editBtn.style.background = "#7cf29c";
      document.getElementById("reset-btn").classList.remove('hidden');
    } else {
      // Switch to confirm mode
      document.getElementById("reset-btn").classList.add('hidden');
      editableElements.forEach((element) => {
        element.setAttribute("contenteditable", "false");
        element.style.border = "none"; // Remove border
        if(element.innerHTML === '<br>') element.innerHTML = '';
      });
  
      editBtn.textContent = "✎"; // Change button back to edit mode
      editBtn.style.background = "#7272f1";
      const state = JSON.parse(localStorage.getItem('state')) || null;
      localStorage.setItem('state', JSON.stringify({title: titleElement.innerText, name: name.innerText, designation: designation.innerText, background: cardContent.style.background.replace(/^url$$["']?/, '').replace(/["']?$$$/, ''), image: profileImage.src}))
    }
  });

  document.getElementById("link")?.addEventListener('click',(e) => {
    e.preventDefault();
    card.classList.add('hidden');
    downloadCard.classList.add('hidden');
    cardOptions.classList.add('hidden');
    document.getElementById('lr-title').classList.add('hidden');
    document.getElementById('lr-description').classList.add('hidden');
    upgradeComponent.classList.add('hidden');
    generateCardBtn.classList.add('hidden');
    cardOptions.classList.add('hidden');
    quota.classList.remove('hidden');
  })

  document.getElementById('openModal').addEventListener('click', function() {
    document.getElementById('modal').style.display = 'flex';
  });

  document.querySelector('.close').addEventListener('click', function() {
    document.getElementById('modal').style.display = 'none';
  });

  document.querySelectorAll('.template-option').forEach(option => {
      option.addEventListener('click', function() {
        const selectedTemplate = this.getAttribute('data-template');
        applyTemplate(selectedTemplate);
        document.getElementById('modal').style.display = 'none';
      });
  });

  function applyTemplate(template) {
    cardContent.className = 'quote-card ' + template; // Apply the selected template class
  }

  profileImage.addEventListener('click', function() {
    uploadImage.click();
  });

  uploadImage.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            profileImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
  });

  randomize.addEventListener('click', function() {
    fetch(`https://api.unsplash.com/photos/random?orientation=portrait&query=${dropdownValue}`, {
      headers: {
          Authorization: `Client-ID ${accessKey}`
      }
    })
    .then(response => response.json())
    .then(data => {
        // Use the image URL from the response
        const imageUrl = data.urls.regular;
        cardContent.style.background = `url(${imageUrl})`;
        localStorage.setItem('state', JSON.stringify({title: titleElement.innerText, name: name.innerText, designation: designation.innerText, background: imageUrl, image: profileImage.src}));
    })
    .catch(error => console.log('Error fetching image:', error));
  });

  dropdownButton.addEventListener('click', function() {
    dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
  });

  document.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', function() {
        dropdownValue = this.getAttribute('data-value');
        dropdownButton.textContent = this.textContent;
        dropdownMenu.style.display = 'none';
      });
  });
});

// // Disable right-click
// document.addEventListener("contextmenu", (event) => event.preventDefault());

// // Disable specific keyboard shortcuts
// document.addEventListener("keydown", (event) => {
//   if (
//     event.key === "F12" || // F12
//     (event.ctrlKey && event.shiftKey && event.key === "I") || // Ctrl+Shift+I
//     (event.ctrlKey && event.shiftKey && event.key === "J") || // Ctrl+Shift+J
//     (event.ctrlKey && event.key === "U") // Ctrl+U (View Source)
//   ) {
//     event.preventDefault();
//   }
// });

