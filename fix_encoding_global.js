const fs = require('fs');
const path = require('path');

const files = [
    "frontend/src/pages/GuestEnquiryPage.jsx",
    "frontend/src/components/MainContent.jsx",
    "backend/controllers/hostelController.js",
    "frontend/src/components/DirectBookingModal.jsx",
    "frontend/src/hooks/useHostelDataPolling.js",
    "backend/controllers/bookingController.js",
    "frontend/src/pages/AllHostelsPortal.jsx"
];

const replacements = [
    // Level 3 (Additional findings)
    { from: "ðŸŽ¯", to: "🎯" },
    { from: "📋¢", to: "📋" },
    { from: "📋Š", to: "📋" },
    { from: "📋¨", to: "📋" },
    { from: "📋¤", to: "📋" },
    { from: "📋¦", to: "📋" },
    { from: "📋¡", to: "📋" },
    { from: "🔓„", to: "🔓" },
    { from: "🔓¥", to: "🔓" },
    { from: "ðŸ’°", to: "💰" },
    { from: "ðŸ’µ", to: "💵" },
    { from: "â„¹ï¸", to: "ℹ️" },

    // Level 2 (Double encoded / Complex)
    { from: "Ã¢Å“â€¦", to: "✅" },
    { from: "Ã¢Å¡ Ã¯Â¸", to: "⚠️" },
    { from: "Ã¢Å¡", to: "⚠️" },
    { from: "ðŸ“‹", to: "📋" }, // Clipboard

    // Level 1 (Windows-1252 viewed as UTF-8)
    { from: "âœ…", to: "✅" },
    { from: "ðŸ—“ï¸", to: "🗓️" },
    { from: "â€“", to: "–" },
    { from: "â€”", to: "—" },
    { from: "â†’", to: "→" },
    { from: "ðŸ”’", to: "🔒" },
    { from: "ðŸ”´", to: "🔴" },
    { from: "ðŸ“„", to: "📄" },
    { from: "âŒ", to: "❌" },
    { from: "âš ï¸", to: "⚠️" },
    { from: "ðŸš€", to: "🚀" },
    { from: "ðŸ”", to: "🔍" },
    { from: "ðŸ¢", to: "🏢" },
    { from: "âœ•", to: "✕" },
    { from: "ðŸ“£", to: "📣" },
    { from: "â­", to: "⭐" },
    { from: "â˜‘ï¸", to: "☑️" },
    { from: "ðŸ“±", to: "📱" },
    { from: "ðŸ“§", to: "📧" },
    { from: "ðŸ’¸", to: "💸" },
    { from: "ðŸ”", to: "🔓" }, 
    { from: "â­ï¸", to: "⏳" }, // Hourglass/Loading
    { from: "1ï¸âƒ£", to: "1️⃣" },
    { from: "2ï¸âƒ£", to: "2️⃣" },
    { from: "3ï¸âƒ£", to: "3️⃣" },
    { from: "4ï¸âƒ£", to: "4️⃣" },
    { from: "ðŸ“", to: "📋" }, // Partial clipboard if cut off
];

function fixFile(filePath) {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
        console.log(`File not found: ${absolutePath}`);
        return;
    }

    try {
        let content = fs.readFileSync(absolutePath, 'utf8');
        let originalContent = content;

        replacements.forEach(({ from, to }) => {
            // Escape special regex characters in 'from' string
            const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedFrom, 'g');
            content = content.replace(regex, to);
        });

        if (content !== originalContent) {
            fs.writeFileSync(absolutePath, content, 'utf8');
            console.log(`✅ Fixed encoding issues in ${filePath}`);
        } else {
            console.log(`No issues found in ${filePath}`);
        }
    } catch (err) {
        console.error(`❌ Error processing ${filePath}:`, err);
    }
}

console.log("Starting global encoding fix...");
files.forEach(fixFile);
console.log("Done.");
