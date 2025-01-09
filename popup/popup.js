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

function resizeImageToSquare(imageSrc, callback) {
  const targetSize = 320;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = imageSrc;
  img.onload = function() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = targetSize;
      canvas.height = targetSize;

      const aspectRatio = img.width / img.height;
      let drawWidth, drawHeight, offsetX, offsetY;

      if (aspectRatio > 1) {
          // Image is wider than it is tall
          drawWidth = targetSize * aspectRatio;
          drawHeight = targetSize;
          offsetX = (drawWidth - targetSize) / 2;
          offsetY = 0;
      } else {
          // Image is taller than it is wide or square
          drawWidth = targetSize;
          drawHeight = targetSize / aspectRatio;
          offsetX = 0;
          offsetY = (drawHeight - targetSize) / 2;
      }

      ctx.drawImage(img, -offsetX, -offsetY, drawWidth, drawHeight);

      // Convert the canvas to a data URL and pass it to the callback
      const resizedImageDataUrl = canvas.toDataURL('image/png');
      callback(resizedImageDataUrl);
  };
  img.onerror = function() {
      console.error('Failed to load image.');
  };
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
async function razorpayPaymentGateway(fullName, email, contact, amout) {
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
          amount: amout, // Amount in paise (₹20 / ₹100)
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
  const upgradeComponent = document.getElementById('upgradeComponent');
  const userInput = document.getElementById('userInput');
  const profileImage = document.getElementById('profileImage');
  const randomize = document.getElementById('randomize');
  const uploadImage = document.getElementById('imageUpload');
  const payButton = document.getElementById('payButton');
  const closeButton = document.getElementById("close-btn");
  const editButton = document.getElementById("edit-btn");
  const resetButton = document.getElementById("reset-btn");
  const editContainer = document.getElementById('editContainer');
  const btnGroup = document.getElementById('btnGroup');
  const homeButton = document.getElementById("home-btn");
  const colorPicker = document.getElementById("colorPicker");
  const randomQuoteBtn = document.getElementById('randomQuoteBtn');
  const bgChangeBtn = document.getElementById('bg-change-btn');
  const bgUpload = document.getElementById('bgUpload');
    
  const textAlignOptions = ['left', 'right', 'center'];
  const fontSizeOptions = ['small', 'medium', 'large', 'x-large', 'xx-large', 'x-small', 'xx-small'];
  const fontFamilyOptions = ['Atma', 'UbuntuMono', 'Barel','Delius', 'Inter', 'Kanit', 'Karla','PlaywriteAUSA','Rasa', 'Roboto','RubikVinyl', 'SchoolBell', 'DynaPuff', 'arial', 'times', 'courier','georgia', 'verdana', 'tahoma','trebuchet', 'impact', 'comic', 'helvetica', 'sans-serif', 'cursive', 'monospace', 'Iceberg', 'Tomorrow', 'Tenali', 'Wallpoet', 'IndieFlower'];
  const FontTypeOptions = ['capitalize', 'uppercase', 'lowercase', 'none'];

  let dropdownValue = 'nature';

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
    randomQuoteBtn.classList.add('hidden');
    titleElement.innerText = state.title;
    name.innerText = state.name || 'Akhilesh';
    designation.innerText = state.designation || 'Founder at QuoteMaker';
    titleElement.style.color = state.color? state.color : '#000000';
    name.style.color = state.color? state.color : '#000000';
    designation.style.color = state.color? state.color : '#000000';
    colorPicker.value = state.color? state.color : '#000000';
    cardContent.querySelector('img'). src = state.backgroundImage || 'default.png';
    cardContent.className = state.template ? state.template : cardContent.className;
    profileImage.src = state.src || 'images/profile.png';
    titleElement.style.fontSize = state.fontSize? state.fontSize : titleElement.style.fontSize;
    titleElement.style.textAlign = state.textAlign? state.textAlign : titleElement.style.textAlign;
    titleElement.style.fontFamily = state.fontFamily? state.fontFamily : titleElement.style.fontFamily;
    titleElement.style.textTransform = state.fontType? state.fontType : titleElement.style.textTransform; 
    card.classList.remove('hidden');
    editContainer.classList.remove('hidden');
    editButton.disabled = false;
    editButton.querySelector('img').src = 'images/edit.png';
    loader.classList.add('hidden');
    cardContent.classList.remove('hidden');
    btnGroup.classList.remove('hidden');
    editContainer.classList.remove('hidden');
    downloadCard.classList.remove('hidden');
  }

  generateCardBtn.addEventListener("click", async () => {

    if(!userInput.value) {
      userInput.style.borderColor= '#fa0814'
      userInput.style.boxShadow = '0 0 5px #fa0814';
      return;
    }else {
      userInput.style.borderColor= '#4CAF50'
      userInput.style.boxShadow = '0 0 5px #277ff3';
    }
  
    loader.classList.remove('hidden');
    card.classList.remove('hidden');
    editContainer.classList.remove('hidden');
    editButton.disabled = false;
    editButton.querySelector('img').src = 'images/edit.png';
    generateCardBtn.classList.add('hidden');
    userInput.classList.add('hidden');
    randomQuoteBtn.classList.add('hidden');
   
    if(!cardContent.classList.contains('hidden')) {
      cardContent.classList.add('hidden');
      btnGroup.classList.add('hidden');
      editContainer.classList.add('hidden');
      downloadCard.classList.add('hidden');
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
      editContainer.classList.remove('hidden');
      editButton.disabled = true;
      editButton.querySelector('img').src = 'images/edit_disabled.png';
      editButton.style.background = '#f3f3f3';
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
        const imageUrl = data?.urls?.regular || 'templates/template1.png';
        resizeImageToSquare(imageUrl, function(resizedImageDataUrl) {
          cardContent.querySelector('img'). src = resizedImageDataUrl;
          titleElement.innerText = userInput.value;
          name.innerText = "Akhilesh";
          designation.innerText = "Founder at QuoteMaker";
          loader.classList.add('hidden');
          cardContent.classList.remove('hidden');
          btnGroup.classList.remove('hidden');
          editContainer.classList.remove('hidden');
          downloadCard.classList.remove('hidden');
          // Update usage data
          if (new Date(usageData.date).toDateString() !== new Date(today).toDateString() ) {
            // Reset usage for a new day
            usageData.date = today;
            usageData.clicks = 0;
            usageData.unlimited = false;
          }
          usageData.clicks += 1;
          localStorage.setItem('usage', JSON.stringify(usageData));
          localStorage.setItem('state', JSON.stringify({title: titleElement.innerText, name: name.innerText, designation: designation.innerText, backgroundImage: resizedImageDataUrl, image: profileImage.src, template: cardContent.className, color: colorPicker.value}));
      });
    })
    .catch(error => {
      titleElement.innerText = userInput.value;
      name.innerText = "Akhilesh";
      designation.innerText = "Founder at QuoteMaker";
      loader.classList.add('hidden');
      cardContent.classList.remove('hidden');
      btnGroup.classList.remove('hidden');
      editContainer.classList.remove('hidden');
      downloadCard.classList.remove('hidden');
      // Update usage data
      if (new Date(usageData.date).toDateString() !== new Date(today).toDateString() ) {
        // Reset usage for a new day
        usageData.date = today;
        usageData.clicks = 0;
        usageData.unlimited = false;
      }
      usageData.clicks += 1;
      localStorage.setItem('usage', JSON.stringify(usageData));
      localStorage.setItem('state', JSON.stringify({title: titleElement.innerText, name: name.innerText, designation: designation.innerText, backgroundImage: '', image: profileImage.src, template: cardContent.className, color: colorPicker.value}));
    });
  
  
  });

  downloadCard.addEventListener('click', function() {

    // Use html2canvas to capture the cardContent
    html2canvas(cardContent, {
        width: cardContent.offsetWidth,
        height: cardContent.offsetHeight,
        scale: 5,
        useCORS: true,
    }).then(canvas => {
       // Resize the canvas to 1080x1080 or 1080x1350
        const resizedCanvas = document.createElement('canvas');
        const targetWidth = 1080;
        const targetHeight = 1080;
        resizedCanvas.width = targetWidth;
        resizedCanvas.height = targetHeight;
        const ctx = resizedCanvas.getContext('2d');

        const scale = Math.min(targetWidth / canvas.width, targetHeight / canvas.height);
        const width = canvas.width * scale;
        const height = canvas.height * scale;
        const x = (targetWidth - width) / 2;
        const y = (targetHeight - height) / 2;

        ctx.drawImage(canvas, x - 2, y, width, height);

        // Convert the resized canvas to a data URL and download it
        const dataURL = resizedCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'quote-card.png';
        link.click();

        card.classList.add('hidden');
        cardContent.classList.add('hidden');
        btnGroup.classList.add('hidden');
        if(editButton.textContent === "✔") {
          const editableElements = cardContent.querySelectorAll("h1, p");
          resetButton.classList.add('hidden');
          bgChangeBtn.classList.add('hidden');
          editableElements.forEach((element) => {
            element.setAttribute("contenteditable", "false");
            element.style.overflow = "hidden";
            if(element.innerHTML === '<br>') element.innerHTML = '';
          });
      
          editButton.innerHTML = "<img src='images/edit.png' width='100%' height='100%'/>";
          resetButton.style.opacity = 0;
          bgChangeBtn.style.opacity = 0;
        }
        editContainer.classList.add('hidden');
        downloadCard.classList.add('hidden');
        loader.classList.remove('hidden');
        generateCardBtn.classList.remove('hidden');
        userInput.classList.remove('hidden');
        randomQuoteBtn.classList.remove('hidden');
        name.style.removeProperty('color');
        designation.style.removeProperty('color');
        titleElement.style.removeProperty('color');
        colorPicker.value = '#000000'
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
    const expiryTime = new Date(new Date(today).getTime() + (document.getElementById('pay1').checked ? 4 : 24) * 60 * 60 * 1000).toLocaleString('en-US', options);
    
    try {
      // Fake API call to payment gateway
      const fullName = document.getElementById('fullName').value.trim();
      const email = document.getElementById('email').value.trim();
      const contact = document.getElementById('contact').value.trim();
      const paymentResponse = await razorpayPaymentGateway(fullName, email, contact, document.getElementById('pay1').checked ? 2000 : 10000);
      
      if (paymentResponse.success) {
        const usageData = JSON.parse(localStorage.getItem('usage')) || {};
        usageData.date = today;
        usageData.unlimited = true; // Unlimited access flag
        localStorage.setItem('usage', JSON.stringify(usageData));
        card.classList.add('hidden');
        quota.classList.add('hidden');
        editContainer.classList.add('hidden');
        editButton.disabled = false;
        editButton.querySelector('img').src = 'images/edit.png'
        editButton.style.background = '#eaf3fe';
        generateCardBtn.classList.remove('hidden');
        userInput.classList.remove('hidden');
        randomQuoteBtn.classList.remove('hidden');
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
  homeButton.addEventListener("click", () => {
    localStorage.removeItem('state');
    try {
      window.location.reload(); // reloads the popup window
    } catch(err) {
      console.log(err);
    }
  });

  resetButton.addEventListener("click", () => {
    const state = JSON.parse(localStorage.getItem('state')) || null;

    if(state) {
      titleElement.innerText = state.title;
      name.innerText = state.name;
      designation.innerText = state.designation;
      cardContent.querySelector('img'). src = state.backgroundImage || 'images/default.png';
      profileImage.src = state.image || 'images/profile.png';
    }
  });

  editButton.addEventListener("click", function () {
    const editBtn = this; // The edit button
  
    // Get all the editable elements (h1, p)
    const editableElements = cardContent.querySelectorAll("h1, p");
  
    if (editBtn.textContent !== "✔") {
      // Switch to edit mode
      editableElements.forEach((element) => {
        element.setAttribute("contenteditable", "true");
      });
  
      editBtn.innerHTML = "✔"; // Change button to confirm mode
      resetButton.classList.remove('hidden');
      bgChangeBtn.classList.remove('hidden');
      resetButton.style.opacity = 1;
      bgChangeBtn.style.opacity = 1;
      titleElement.focus();
    } else {
      // Switch to confirm mode
      resetButton.classList.add('hidden');
      bgChangeBtn.classList.add('hidden');
      editableElements.forEach((element) => {
        element.setAttribute("contenteditable", "false");
        element.style.overflow = "hidden";
        if(element.innerHTML === '<br>') element.innerHTML = '';
      });
  
      editBtn.innerHTML = "<img src='images/edit.png' width='100%' height='100%'/>";
      resetButton.style.opacity = 0;
      bgChangeBtn.style.opacity = 0;
      localStorage.setItem('state', JSON.stringify({title: titleElement.innerText, name: name.innerText, designation: designation.innerText, backgroundImage: cardContent.querySelector('img'). src.replace(/^url$$["']?/, '').replace(/["']?$$$/, ''), image: profileImage.src, template: cardContent.className, color: colorPicker.value}))
    }
  });

  document.getElementById("link")?.addEventListener('click',(e) => {
    e.preventDefault();
    card.classList.add('hidden');
    downloadCard.classList.add('hidden');
    document.getElementById('lr-title').classList.add('hidden');
    document.getElementById('lr-description').classList.add('hidden');
    upgradeComponent.classList.add('hidden');
    generateCardBtn.classList.add('hidden');
    userInput.classList.add('hidden');
    randomQuoteBtn.classList.add('hidden');
    quota.classList.remove('hidden');
    editContainer.classList.remove('hidden');
    btnGroup.classList.add('hidden');
    resetButton.classList.add('hidden');
    bgUpload.classList.add('hidden');
    editButton.disabled = true;
    editButton.querySelector('img').src = 'images/edit_disabled.png';
    editButton.style.background = '#f3f3f3';
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
        applyTemplate(selectedTemplate, `templates/${selectedTemplate}.png`);
      });
  });

  function applyTemplate(template, background) {
    titleElement.style.removeProperty('font-family');
    titleElement.style.removeProperty('font-size');
    titleElement.style.removeProperty('text-transform');
    titleElement.style.removeProperty('text-align');
    titleElement.style.removeProperty('color');
    name.style.removeProperty('color');
    designation.style.removeProperty('color');
    cardContent.style.removeProperty('background-image');
    resizeImageToSquare(background, function(resizedImageDataUrl) {
      cardContent.querySelector('img').src = resizedImageDataUrl;
      document.querySelectorAll('.dropdown-toggle').forEach(button => {button.innerText = ''});
      colorPicker.value = '#000000';
      cardContent.className = 'quote-card ' + template;
      document.getElementById('modal').style.display = 'none';
      localStorage.setItem('state', JSON.stringify({title: titleElement.innerText, name: name.innerText, designation: designation.innerText, backgroundImage: resizedImageDataUrl, image: profileImage.src, template: cardContent.className, color: colorPicker.value}))
  });
  }

  profileImage.addEventListener('click', function() {
    uploadImage.click();
  });
  let prevImage = 'images/profile.png';
  profileImage.addEventListener('mouseenter', function() {
    prevImage = profileImage.src;
    profileImage.src = 'images/upload.webp';

  });
  profileImage.addEventListener('mouseleave', function() {
    profileImage.src = prevImage;
  });

  uploadImage.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          resizeImageToSquare(e.target.result, (resizedImageDataUrl) => {
            profileImage.src = resizedImageDataUrl;
            prevImage = resizedImageDataUrl;
            localStorage.setItem('state', JSON.stringify({title: titleElement.innerText, name: name.innerText, designation: designation.innerText, backgroundImage: resizedImageDataUrl, image: profileImage.src, template: cardContent.className, color: colorPicker.value}))
          })
        };
        reader.readAsDataURL(file);
    }
  });

  bgChangeBtn.addEventListener('click', () => {
    bgUpload.click();
  })

  bgUpload.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          resizeImageToSquare(e.target.result, function(resizedImageDataUrl) {
            cardContent.querySelector('img'). src = resizedImageDataUrl;
        });
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
        resizeImageToSquare(data?.urls?.regular || 'templates/template1.png', function(resizedImageDataUrl) {
          const imageUrl = resizedImageDataUrl;
          cardContent.querySelector('img').src = imageUrl;
          localStorage.setItem('state', JSON.stringify({title: titleElement.innerText, name: name.innerText, designation: designation.innerText, backgroundImage: imageUrl, image: profileImage.src, template: cardContent.className, color: colorPicker.value}));
      });
    })
    .catch(error => {
      console.log('Error fetching image:', error)});
  });

  document.querySelectorAll('.dropdown-toggle').forEach(button => {
    button.addEventListener('click', function() {
      const dropdownMenu = this.nextElementSibling;
      dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
    });
  });

  document.querySelectorAll('.dropdown-item').forEach((item) => {
    item.addEventListener('click', function() {
      const dropdownButton = this.parentElement.previousElementSibling;
      dropdownButton.textContent = this.textContent;
      this.parentElement.style.display = 'none';
      const value = this.getAttribute('data-value');
      
      if(fontSizeOptions.indexOf(value) > -1) {
        titleElement.style.fontSize = value;
        localStorage.setItem('state', JSON.stringify({title: titleElement.innerText, name: name.innerText, designation: designation.innerText, backgroundImage: cardContent.querySelector('img'). src.replace(/^url$$["']?/, '').replace(/["']?$$$/, ''), image: profileImage.src, template: cardContent.className, color: colorPicker.value, fontSize: value, fontFamily: titleElement.style.fontFamily, textAlign: titleElement.style.textAlign, fontType: titleElement.style.textTransform}))
      } else if(textAlignOptions.indexOf(value) > -1) {
        titleElement.style.textAlign = value;
        localStorage.setItem('state', JSON.stringify({title: titleElement.innerText, name: name.innerText, designation: designation.innerText, backgroundImage: cardContent.querySelector('img'). src.replace(/^url$$["']?/, '').replace(/["']?$$$/, ''), image: profileImage.src, template: cardContent.className, color: colorPicker.value, fontSize: titleElement.style.fontSize, fontFamily: titleElement.style.fontFamily, textAlign: value, fontType: titleElement.style.textTransform}))
      } else if(fontFamilyOptions.indexOf(value) > -1) {
        titleElement.style.fontFamily = value;
        localStorage.setItem('state', JSON.stringify({title: titleElement.innerText, name: name.innerText, designation: designation.innerText, backgroundImage: cardContent.querySelector('img'). src.replace(/^url$$["']?/, '').replace(/["']?$$$/, ''), image: profileImage.src, template: cardContent.className, color: colorPicker.value, fontSize: titleElement.style.fontSize, fontFamily: value, textAlign: titleElement.style.textAlign, fontType: titleElement.style.textTransform}))
      } else if(FontTypeOptions.indexOf(value) > -1) {
        titleElement.style.textTransform = value;
        localStorage.setItem('state', JSON.stringify({title: titleElement.innerText, name: name.innerText, designation: designation.innerText, backgroundImage: cardContent.querySelector('img'). src.replace(/^url$$["']?/, '').replace(/["']?$$$/, ''), image: profileImage.src, template: cardContent.className, color: colorPicker.value, fontSize: titleElement.style.fontSize, fontFamily: titleElement.style.fontFamily, textAlign: titleElement.style.textAlign, fontType: value}))
      } else {
        dropdownValue = value
      }
    });
  });

  colorPicker.addEventListener('change', () => {
    titleElement.style.color = colorPicker.value || '#000000';
    name.style.color = colorPicker.value || '#000000';
    designation.style.color = colorPicker.value || '#000000';
    localStorage.setItem('state', JSON.stringify({title: titleElement.innerText, name: name.innerText, designation: designation.innerText, backgroundImage: cardContent.querySelector('img'). src.replace(/^url$$["']?/, '').replace(/["']?$$$/, ''), image: profileImage.src, template: cardContent.className, color: colorPicker.value}))
  })

  randomQuoteBtn.addEventListener('click', () => {
    fetch(`https://api.adviceslip.com/advice`)
    .then(response => response.json())
    .then(data => {
      const { advice } = data.slip;
      userInput.value = advice;
    })
  })

  document.getElementById('pay1').addEventListener('change', (e) => {
    payButton.innerHTML = 'Pay ₹20.00';
    document.getElementById('showAmt').innerHTML = 'Unlock unlimited card generation for the next 4 hours by upgrading for just <strong >₹20!</strong>';
  })
  document.getElementById('pay2').addEventListener('change', (e) => {
    payButton.innerHTML = 'Pay ₹100.00';
    document.getElementById('showAmt').innerHTML = 'Unlock unlimited card generation for the next 24 hours by upgrading for just <strong >₹100!</strong>';
  })
});

// Disable right-click
document.addEventListener("contextmenu", (event) => event.preventDefault());

// Disable specific keyboard shortcuts
document.addEventListener("keydown", (event) => {
  if (
    event.key === "F12" || // F12
    (event.ctrlKey && event.shiftKey && event.key === "I") || // Ctrl+Shift+I
    (event.ctrlKey && event.shiftKey && event.key === "J") || // Ctrl+Shift+J
    (event.ctrlKey && event.key === "U") // Ctrl+U (View Source)
  ) {
    event.preventDefault();
  }
});

