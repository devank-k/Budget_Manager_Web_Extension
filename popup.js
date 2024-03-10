// Retrieve elements from the DOM
const spendButton = document.getElementById("submitButton");
const amountInputField = document.getElementById("amountInputField");
const totalDisplay = document.getElementById("spendDisplay");
const limitDisplay = document.getElementById("limitDisplay");
let currencySelect; // Define currencySelect variable here

// Function to get the current month and year
function getCurrentMonthYear() {
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1; // Month is zero-based, so add 1
    const year = currentDate.getFullYear();
    return { month, year };
}

// Function to format the dates as "1/1/2024 - 31/1/2024"
function formatMonthRange(month, year) {
    // Get the last day of the month
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    return `1/${month}/${year} - ${lastDayOfMonth}/${month}/${year}`;
}

// Update the banner with the current month range
const banner = document.querySelector("header");
const { month, year } = getCurrentMonthYear();
const monthRange = formatMonthRange(month, year);
banner.insertAdjacentHTML(
    "beforeend",
    `<div id="monthRange">${monthRange}</div>`
);

// Function to save the limit to Chrome storage
function saveLimitToStorage(newLimit) {
    chrome.storage.sync.set({ limit: newLimit }, () => {
        console.log("Limit updated to:", newLimit);
    });
}

// Retrieve total and limit from storage
chrome.storage.sync.get(["total", "limit"], (data) => {
    totalDisplay.innerText = data.total || 0;
    const limitValue = data.limit || 5000; // Default limit if not saved previously
    limitDisplay.innerText = limitValue;
});

// Initialize currencySelect after DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    currencySelect = document.getElementById("currencySelect");
});

// Event listener for Update Limit link
const updateLimitLink = document.getElementById("updateLimitLink");
updateLimitLink.addEventListener("click", () => {
    const limitUpdateContainer = document.getElementById("limitUpdateContainer");
    if (limitUpdateContainer.style.display === "none") {
        limitUpdateContainer.style.display = "block";
    } else {
        limitUpdateContainer.style.display = "none";
    }
});

// Event listener for Update Limit button
const updateLimitButton = document.getElementById("updateLimitButton");
const limitUpdateContainer = document.getElementById("limitUpdateContainer");

updateLimitButton.addEventListener("click", () => {
    const newLimit = parseFloat(document.getElementById("limitInputField").value);
    if (!isNaN(newLimit)) {
        saveLimitToStorage(newLimit); // Save the new limit to Chrome storage
        limitDisplay.innerText = newLimit;
    } else {
        alert("Please enter a valid limit.");
        return; // Exit the function if the limit is not valid
    }

    // Toggle the visibility of the limit update container
    limitUpdateContainer.style.display = "none";

    // Get the limitNotification element after the container is hidden
    const limitNotification = document.getElementById("limitNotification");

    // Show the notification
    limitNotification.innerText = "Limit updated successfully!";
    limitNotification.classList.add("show");
    setTimeout(() => {
        limitNotification.classList.remove("show"); // Hide the notification after 3 seconds
    }, 3000);
});

// Add event listener for keypress on the limit input field
const limitInputField = document.getElementById("limitInputField");
limitInputField.addEventListener("keypress", function (event) {
    // Check if the key pressed is Enter
    if (event.key === "Enter") {
        // Programmatically trigger click event on the updateLimitButton
        updateLimitButton.click();
    }
});

// Function to load and display the money conversion content
const loadConversionContent = async () => {
    try {
        const response = await fetch("conversion.html");
        const data = await response.text();
        document.getElementById("mainContent").innerHTML = data;

        // Initialize currencySelect after loading conversion content
        currencySelect = document.getElementById("currencySelect");
        populateCurrencySelect(); // Populate currency options after loading conversion content

        // Add event listener for Convert button after loading content
        const convertButton = document.getElementById("convertButton");
        if (convertButton) {
            convertButton.addEventListener("click", () => {
                convertCurrency(); // Call the convertCurrency function
            });

            // Add event listener for keypress on the amount input field
            const amountToConvertInput = document.getElementById("amountToConvert");
            amountToConvertInput.addEventListener("keypress", function (event) {
                // Check if the key pressed is Enter
                if (event.key === "Enter") {
                    // Programmatically trigger click event on the convertButton
                    convertButton.click();
                }
            });
        } else {
            console.error("Convert button not found.");
        }
    } catch (error) {
        console.error("Error fetching conversion content:", error);
    }
};


// Function to perform currency conversion
const convertCurrency = async () => {
    const fromCurrency = document.getElementById("fromCurrency").value;
    const toCurrency = document.getElementById("toCurrency").value;
    const amountToConvert = parseFloat(
        document.getElementById("amountToConvert").value
    );

    if (isNaN(amountToConvert)) {
        alert("Please enter a valid amount to convert.");
        return;
    }

    if (fromCurrency === toCurrency) {
        alert("Please select different currencies for conversion.");
        return;
    }

    try {
        const rates = await fetchExchangeRates();
        const fromRate = rates[fromCurrency];
        const toRate = rates[toCurrency];

        if (fromRate && toRate) {
            const convertedAmount = amountToConvert * (toRate / fromRate);
            displayConvertedAmount(convertedAmount, toCurrency);
        } else {
            console.error("Invalid currency selection.");
        }
    } catch (error) {
        console.error("Error fetching exchange rates:", error);
    }
};

// Function to display converted amount
function displayConvertedAmount(convertedAmount, toCurrency) {
    document.getElementById(
        "convertedAmount"
    ).innerText = `Converted Amount: ${convertedAmount.toFixed(2)} ${toCurrency}`;
}

let newTotal = 0; // Initialize newTotal outside the event listener block

// Function to save transaction to Chrome storage
function saveTransactionToStorage(amount) {
    const currentDate = new Date();
    const transaction = {
        amount: amount,
        dateTime: currentDate, // Store the date and time
    };

    chrome.storage.sync.get("history", (data) => {
        if (chrome.runtime.lastError) {
            console.error(
                "Error retrieving history from Chrome storage:",
                chrome.runtime.lastError
            );
            return; // Exit the function if there's an error
        }

        let historyArray = [];
        if (data.history) {
            historyArray = JSON.parse(data.history);
        }
        historyArray.push(transaction);
        chrome.storage.sync.set({ history: JSON.stringify(historyArray) });
    });
}

// Event listener for Spend
spendButton.addEventListener("click", () => {
    chrome.storage.sync.get(["total", "limit"], (data) => {
        newTotal = 0; // Reset newTotal within the event listener block
        if (data.total) {
            newTotal += Number(data.total);
        }

        const amount = Number(amountInputField.value);
        if (amount) {
            newTotal += amount;

            // Save transaction to history
            saveTransactionToStorage(amount);
        }

        // Update total and limit display
        chrome.storage.sync.set({ total: newTotal });
        totalDisplay.innerText = newTotal;

        // Update total money spent styling if limit is reached
        if (newTotal > limitDisplay.innerText) {
            // Show the notification
            limitreached.innerText = "You have exceeded your limit!";
            limitreached.classList.add("show");
            setTimeout(() => {
                limitreached.classList.remove("show"); // Hide the notification after 3 seconds
            }, 3000);
        } else {
            totalDisplay.classList.remove("exceeded-limit");
        }

        // Clear input field
        amountInputField.value = "";
    });
});

// Add event listener to the input field
amountInputField.addEventListener("keypress", function (event) {
    // Check if the key pressed is Enter
    if (event.key === "Enter") {
        // Programmatically trigger click event on the spend button
        spendButton.click();
    }
});

// Function to handle deletion of history
function deleteHistory() {
    // Remove history data from Chrome storage
    chrome.storage.sync.remove("history", () => {
        console.log("History deleted");
        // Clear the history list
        const historyList = document.getElementById("historyList");
        historyList.innerHTML = "";
    });
}

const loadHistoryContent = async () => {
    try {
        const response = await fetch("history.html");
        const data = await response.text();
        document.getElementById("mainContent").innerHTML = data;

        // Add event listener for the delete history button after loading content
        const deleteButton = document.getElementById("deleteHistoryButton");
        if (deleteButton) {
            deleteButton.addEventListener("click", deleteHistory);
        } else {
            console.error("Delete history button not found.");
        }

        // Retrieve transaction history from Chrome storage
        chrome.storage.sync.get("history", (data) => {
            if (chrome.runtime.lastError) {
                console.error(
                    "Error retrieving history from Chrome storage:",
                    chrome.runtime.lastError
                );
                return; // Exit the function if there's an error
            }

            const historyList = document.getElementById("historyList");

            // Retrieve the selected country from Chrome storage
            chrome.storage.sync.get("selectedCountry", (countryData) => {
                if (
                    countryData.selectedCountry &&
                    countryData.selectedCountry.countryCode
                ) {
                    const countryCode = countryData.selectedCountry.countryCode;

                    if (data.history) {
                        const historyArray = JSON.parse(data.history);
                        // Reverse the array to display the most recent transactions at the top
                        historyArray.reverse().forEach((transaction) => {
                            const listItem = document.createElement("li");
                            const dateTime = new Date(transaction.dateTime);
                            const formattedDate = `${dateTime
                                .getDate()
                                .toString()
                                .padStart(2, "0")}/${(dateTime.getMonth() + 1)
                                    .toString()
                                    .padStart(1, "0")}/${dateTime.getFullYear()}`;
                            const formattedDateTime = `${formattedDate} ${dateTime.toLocaleTimeString()}`;

                            // Fetch the currency info for the selected country
                            fetchCountries()
                                .then((countries) => {
                                    const selectedCountry = countries.find(
                                        (country) => country.cca3 === countryCode
                                    );

                                    if (selectedCountry && selectedCountry.currencies) {
                                        const currencyInfo =
                                            selectedCountry.currencies[
                                            Object.keys(selectedCountry.currencies)[0]
                                            ]; // Fetch the currency info
                                        const currencySymbol = currencyInfo.symbol; // Fetch the currency symbol
                                        listItem.innerHTML = `Amount: <span class="currencyCode">${currencySymbol}</span> ${transaction.amount}, Date: ${formattedDateTime}`;
                                    } else {
                                        console.warn("No currency found for the selected country.");
                                    }
                                })
                                .catch((error) => {
                                    console.error("Error fetching countries:", error);
                                });

                            historyList.appendChild(listItem);
                        });
                    }
                } else {
                    console.warn(
                        "No country code found in Chrome storage for history display."
                    );
                }
            });
        });
    } catch (error) {
        console.error("Error fetching history content:", error);
    }
};

// Get the limitNotification element after the container is hidden
const limitNotificationred = document.getElementById("limitreached");

// Check if the new total exceeds the limit
if (newTotal > limitDisplay.innerText) {
    // Show the notification
    limitNotificationred.innerText = "You have exceeded your limit!";
    limitNotificationred.classList.add("show");
    limitNotificationred.classList.add("notificationred"); // Add the notificationred class
    setTimeout(() => {
        limitNotificationred.classList.remove("show"); // Hide the notification after 3 seconds
    }, 3000);
}

// Event listener for Money Conversion link
const conversionLink = document.getElementById("conversionLink");
conversionLink.addEventListener("click", () => {
    loadConversionContent(); // Load and display money conversion content
});

// Function to fetch exchange rates
async function fetchExchangeRates() {
    const response = await fetch(
        "https://api.exchangerate-api.com/v4/latest/INR"
    );
    const data = await response.json();
    return data.rates;
}

// Function to populate the currency select options
async function populateCurrencySelect() {
    const rates = await fetchExchangeRates();
    const fromCurrencySelect = document.getElementById("fromCurrency");
    const toCurrencySelect = document.getElementById("toCurrency");

    for (const currency in rates) {
        const option1 = document.createElement("option");
        option1.value = currency;
        option1.textContent = currency;
        fromCurrencySelect.appendChild(option1);

        const option2 = document.createElement("option");
        option2.value = currency;
        option2.textContent = currency;
        toCurrencySelect.appendChild(option2);
    }
}

// Event listener for Home link
const homeLink = document.getElementById("homeLink");
homeLink.addEventListener("click", () => {
    // Reload the popup page
    window.location.href = "popup.html";
});

// Event listener for History link
const historyLink = document.getElementById("historyLink");
historyLink.addEventListener("click", () => {
    loadHistoryContent(); // Load and display history content
});

// Function to load overview content
const loadOverviewContent = async () => {
    try {
        // Fetch the overview.html file
        const response = await fetch("overview.html");
        const data = await response.text();

        // Set the fetched HTML content into the mainContent element
        document.getElementById("mainContent").innerHTML = data;

        // Fetch countries
        const countries = await fetchCountries();

        // Populate country select options
        populateCountrySelect(countries);

        // Add event listener to save selected country to Chrome storage
        const countrySelect = document.getElementById("countrySelect");
        countrySelect.addEventListener("change", () => {
            const selectedCountryCode = countrySelect.value;
            const selectedCountryName =
                countrySelect.options[countrySelect.selectedIndex].textContent;

            // Save selected country to Chrome storage
            saveSelectedCountryToLocalStorage(
                selectedCountryCode,
                selectedCountryName
            );
        });
    } catch (error) {
        console.error("Error fetching overview content:", error);
    }
};

// Function to save selected country to Chrome storage
function saveSelectedCountryToLocalStorage(countryCode, countryName) {
    chrome.storage.sync.set(
        { selectedCountry: { countryCode, countryName } },
        () => {
            console.log(`Selected country saved: ${countryName} (${countryCode})`);
        }
    );
}

// Retrieve selected country from Chrome storage
chrome.storage.sync.get("selectedCountry", (data) => {
    const selectedCountryContainer = document.getElementById(
        "selectedCountryContainer"
    );

    if (data.selectedCountry && data.selectedCountry.countryName) {
        const countryName = data.selectedCountry.countryName;
        const countryCode = data.selectedCountry.countryCode;

        const countryElement = document.createElement("div");
        countryElement.textContent = `${countryCode} - ${countryName}`;
        countryElement.classList.add("selected-country");

        selectedCountryContainer.innerHTML = "";
        selectedCountryContainer.appendChild(countryElement);
    } else {
        selectedCountryContainer.innerHTML = "No country selected.";
    }
});

// Add the container element for the selected country below the date
const selectedCountryContainer = document.createElement("div");
selectedCountryContainer.id = "selectedCountryContainer";
banner.insertBefore(selectedCountryContainer, banner.firstChild.nextSibling);

// Add an event listener to the overviewLink to trigger loading overview content
document
    .getElementById("overviewLink")
    .addEventListener("click", loadOverviewContent);

// Add event listener to dark mode toggle button
document
    .getElementById("darkModeToggle")
    .addEventListener("click", toggleDarkMode);

// Function to toggle dark mode
function toggleDarkMode() {
    // Toggle the 'dark-mode' class on the body element
    document.body.classList.toggle("dark-mode");

    // Store the dark mode state in localStorage
    const isDarkMode = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", isDarkMode);

    console.log("Dark mode toggled");
}

// Function to apply dark mode based on stored state
function applyDarkMode() {
    const isDarkMode = localStorage.getItem("darkMode") === "true";
    if (isDarkMode) {
        document.body.classList.add("dark-mode");
    }
}

// Event listener for dark mode toggle button
document.addEventListener("DOMContentLoaded", () => {
    const darkModeToggle = document.getElementById("darkModeToggle");
    if (darkModeToggle) {
        darkModeToggle.addEventListener("click", toggleDarkMode);
    } else {
        console.error("Dark mode toggle button not found.");
    }

    // Apply dark mode based on stored state
    applyDarkMode();
});

document.addEventListener("DOMContentLoaded", function () {
    // Retrieve the switch state from local storage
    const darkModeToggle = document.getElementById("darkModeToggle");
    const isDarkMode = JSON.parse(localStorage.getItem("isDarkMode"));

    // Update the switch state based on the retrieved value
    if (isDarkMode) {
        darkModeToggle.checked = true;
        enableDarkMode();
    } else {
        darkModeToggle.checked = false;
        disableDarkMode();
    }

    // Event listener to toggle dark mode and save state in local storage
    darkModeToggle.addEventListener("change", function () {
        if (darkModeToggle.checked) {
            enableDarkMode();
            localStorage.setItem("isDarkMode", true);
        } else {
            disableDarkMode();
            localStorage.setItem("isDarkMode", false);
        }
    });

    // Function to enable dark mode
    function enableDarkMode() {
        document.body.classList.add("dark-mode");
    }

    // Function to disable dark mode
    function disableDarkMode() {
        document.body.classList.remove("dark-mode");
    }
});

async function fetchCountries() {
    const response = await fetch("https://restcountries.com/v3.1/all");
    const data = await response.json();
    return data;
}

function populateCountrySelect(countries) {
    const countrySelect = document.getElementById("countrySelect");

    // Sort countries by name in ascending order
    countries.sort((a, b) => a.name.common.localeCompare(b.name.common));

    // Populate select element
    countries.forEach((country) => {
        const option = document.createElement("option");
        option.value = country.cca3; // Use the ISO 3166-1 alpha-3 country code as the value
        option.textContent = country.name.common;
        countrySelect.appendChild(option);
    });
}

// Retrieve selected country from Chrome storage
chrome.storage.sync.get("selectedCountry", (data) => {
    const currencyDisplays = document.querySelectorAll(".currencyDisplay");

    if (data.selectedCountry && data.selectedCountry.countryCode) {
        const countryCode = data.selectedCountry.countryCode;

        // Fetch countries
        fetchCountries()
            .then((countries) => {
                const selectedCountry = countries.find(
                    (country) => country.cca3 === countryCode
                );

                if (selectedCountry && selectedCountry.currencies) {
                    const currencyInfo =
                        selectedCountry.currencies[
                        Object.keys(selectedCountry.currencies)[0]
                        ]; // Fetch the currency info
                    const currencySymbol = currencyInfo.symbol; // Fetch the currency symbol
                    currencyDisplays.forEach((display) => {
                        display.textContent = currencySymbol;
                    }); // Display the currency symbol
                }
            })
            .catch((error) => {
                console.error("Error fetching countries:", error);
            });
    } else {
        console.warn("No country or country code found in Chrome storage.");
    }
});

