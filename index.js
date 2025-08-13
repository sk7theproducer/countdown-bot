import { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import path from 'path';
import { fileURLToPath } from 'url';

const TOKEN = process.env.TOKEN;

// Get current folder path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Event schedule (EST)
const events = [
    {
        name: 'Admin Abuse Friday',
        day: 5, // Friday
        hour: 11,
        minute: 0,
        activeMessage: '🟢 ADMIN ABUSE ACTIVE',
        imagePath: path.join(__dirname, 'images', 'admin_abuse.png'),
        channelId: '1405043407558148129'
    },
    {
        name: 'Taco Tuesday',
        day: 2, // Tuesday
        hour: 17,
        minute: 0,
        activeMessage: '🌮 TACO TUESDAY ACTIVE',
        imagePath: path.join(__dirname, 'images', 'taco_tuesday.png'),
        channelId: '1405048581672669184'
    }
];

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

let messageIds = {}; // Store message IDs for each event

function getNextEventTime(day, hour, minute) {
    const now = new Date();
    let next = new Date(now);

    // Convert EST to UTC (EST is UTC-5, adjust for DST if needed)
    next.setUTCHours(hour + 5, minute, 0, 0);

    while (next.getUTCDay() !== day || next <= now) {
        next.setUTCDate(next.getUTCDate() + 1);
        next.setUTCHours(hour + 5, minute, 0, 0);
    }
    return next;
}

function formatTime(ms) {
    let totalMinutes = Math.floor(ms / 1000 / 60);
    let days = Math.floor(totalMinutes / 1440); // 1440 min = 1 day
    let hours = Math.floor((totalMinutes % 1440) / 60);
    let minutes = totalMinutes % 60;

    let parts = [];
    if (days > 0) parts.push(`${days} Day${days === 1 ? '' : 's'}`);
    if (hours > 0 || days > 0) parts.push(`${hours} Hour${hours === 1 ? '' : 's'}`);
    if (minutes > 0 || (days === 0 && hours === 0)) parts.push(`${minutes} Minute${minutes === 1 ? '' : 's'}`);

    return parts.join(' ');
}

async function updateCountdowns() {
    for (let event of events) {
        try {
            const now = new Date();
            const nextEvent = getNextEventTime(event.day, event.hour, event.minute);
            let diff = nextEvent - now;

            let displayText;
            if (diff <= 0 && diff > -3600000) { // Event active for 1 hour
                displayText = event.activeMessage;
            } else if (diff <= -3600000) {
                // Get next event time one week later
                const updatedNext = new Date(nextEvent.getTime() + 7 * 24 * 60 * 60 * 1000);
                diff = updatedNext - now;
                displayText = `⏳ ${formatTime(diff)}`;
            } else {
                displayText = `⏳ ${formatTime(diff)}`;
            }

            const attachment = new AttachmentBuilder(event.imagePath);
            const embed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setImage(`attachment://${path.basename(event.imagePath)}`)
                .setDescription(`**${displayText}**`);

            const channel = await client.channels.fetch(event.channelId);

            if (!messageIds[event.name]) {
                const msg = await channel.send({ embeds: [embed], files: [attachment] });
                messageIds[event.name] = msg.id;
            } else {
                const msg = await channel.messages.fetch(messageIds[event.name]);
                await msg.edit({ embeds: [embed], files: [attachment] });
            }
        } catch (error) {
            console.error(`Failed to update countdown for event ${event.name}:`, error);
        }
    }
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    updateCountdowns();
    setInterval(updateCountdowns, 60000);
});

client.login(TOKEN);