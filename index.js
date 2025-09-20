
const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const { QuickDB } = require('quick.db');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

// Initialize database
const db = new QuickDB();

// Bot configuration
const config = {
    token: process.env.DISCORD_TOKEN,
    developers: ['febiiiiiiiiiiii', 'tc_comunity', 'leio9734'],
    premiumCode: 'APALU',
    reportChannelId: null,
    globalReportGuildId: null,
    bannerUrl: 'https://cdn.discordapp.com/attachments/1403957950447484929/1405067752674299904/standard_3.gif',
    youtubeApiKey: 'AIzaSyC8-85GNGJ5VfEkWZdcXVBezGNsk7mOt5Q'
};

// Music queue system
const musicQueues = new Map();

// Job types with permissions
const jobTypes = {
    'polisi': {
        permissions: [PermissionFlagsBits.MuteMembers, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.KickMembers],
        salary: 50000,
        color: 0x0000ff,
        roleName: 'Polisi'
    },
    'pemerintah': {
        permissions: [PermissionFlagsBits.Administrator],
        salary: 100000,
        color: 0xff0000,
        roleName: 'Pemerintah'
    },
    'dokter': {
        permissions: [],
        salary: 30000,
        color: 0x00ff00,
        roleName: 'Dokter'
    },
    'pemancing': {
        permissions: [],
        salary: 0,
        color: 0x00ffff,
        workable: true,
        roleName: 'Pemancing'
    },
    'pendam': {
        permissions: [],
        salary: 25000,
        color: 0xff9900,
        roleName: 'Pendam'
    },
    'adc': {
        permissions: [],
        salary: 40000,
        color: 0x9900ff,
        roleName: 'ADC'
    }
};

// Fish types for fishing
const fishTypes = [
    { name: 'Ikan Kecil', price: 500, rarity: 'common' },
    { name: 'Ikan Sedang', price: 1500, rarity: 'common' },
    { name: 'Ikan Besar', price: 3000, rarity: 'uncommon' },
    { name: 'Ikan Tuna', price: 5000, rarity: 'uncommon' },
    { name: 'Ikan Salmon', price: 8000, rarity: 'rare' },
    { name: 'Ikan Hiu', price: 15000, rarity: 'legendary' },
    { name: 'Ikan Paus', price: 25000, rarity: 'legendary' },
    { name: 'Ikan Mas', price: 2000, rarity: 'common' },
    { name: 'Ikan Lele', price: 1800, rarity: 'common' },
    { name: 'Ikan Gurame', price: 3500, rarity: 'uncommon' }
];

// Indonesian banks
const indonesianBanks = [
    'Bank BRI', 'Bank Mandiri', 'Bank BCA', 'Bank BNI', 'Bank Kaltim',
    'Bank Danamon', 'Bank CIMB Niaga', 'Bank BTN', 'Bank Permata',
    'Bank Syariah Indonesia', 'Bank Mega', 'Bank Bukopin', 'Bank Maybank'
];

// Indonesia time zones with cities
const indonesianTimeZones = {
    'WIB (Jakarta)': 'Asia/Jakarta',
    'WIB (Bandung)': 'Asia/Jakarta', 
    'WIB (Surabaya)': 'Asia/Jakarta',
    'WIB (Medan)': 'Asia/Jakarta',
    'WIB (Semarang)': 'Asia/Jakarta',
    'WIB (Palembang)': 'Asia/Jakarta',
    'WITA (Makassar)': 'Asia/Makassar',
    'WITA (Denpasar)': 'Asia/Makassar',
    'WITA (Banjarmasin)': 'Asia/Makassar',
    'WITA (Mataram)': 'Asia/Makassar',
    'WIT (Jayapura)': 'Asia/Jayapura',
    'WIT (Ambon)': 'Asia/Jayapura',
    'WIT (Manokwari)': 'Asia/Jayapura'
};

// World time zones
const worldTimeZones = {
    'UTC': 'UTC',
    'New York': 'America/New_York',
    'Los Angeles': 'America/Los_Angeles',
    'London': 'Europe/London',
    'Paris': 'Europe/Paris',
    'Berlin': 'Europe/Berlin',
    'Moscow': 'Europe/Moscow',
    'Tokyo': 'Asia/Tokyo',
    'Seoul': 'Asia/Seoul',
    'Beijing': 'Asia/Shanghai',
    'Hong Kong': 'Asia/Hong_Kong',
    'Singapore': 'Asia/Singapore',
    'Sydney': 'Australia/Sydney',
    'Dubai': 'Asia/Dubai',
    'Mumbai': 'Asia/Kolkata',
    'Bangkok': 'Asia/Bangkok'
};

// Create client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ]
});

// Collections
client.commands = new Collection();
client.buttons = new Collection();
client.modals = new Collection();
client.selects = new Collection();

// Language system
const languages = {
    id: require('./lang/id.json'),
    en: require('./lang/en.json'),
    jp: require('./lang/jp.json'),
    kr: require('./lang/kr.json'),
    fr: require('./lang/fr.json')
};

// Helper functions
async function isDeveloper(username, db = null) {
    if (!db) return config.developers.includes(username);
    const developers = await db.get('developers_list') || config.developers;
    return developers.includes(username);
}

async function getUserLanguage(userId) {
    return await db.get(`user_${userId}_language`) || 'id';
}

async function translate(userId, key) {
    const lang = await getUserLanguage(userId);
    return languages[lang][key] || languages.id[key] || key;
}

// Generate random code
function generateCode(prefix, length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = prefix + '-';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Main menu embed
async function createMainMenu(userId) {
    const lang = await getUserLanguage(userId);
    const embed = new EmbedBuilder()
        .setTitle('🤖 NEBIX V20 VERSI UNGGULAN - MAIN PANEL')
        .setDescription('**HALLO WELCOME TO NEBIX V20 VERSI UNGGULAN**\n\n![Banner](https://cdn.discordapp.com/attachments/1403957950447484929/1405067752674299904/standard_3.gif)\n\n✨ Bot multi-fungsi terlengkap untuk server Discord Anda\n🎯 Pilih panel yang ingin Anda akses di bawah ini\n\n🔥 **Fitur Unggulan:**\n• 💎 Sistem Premium & Economy\n• 🎵 Music Player YouTube\n• 🏦 Sistem Bank & Transfer\n• 💼 Sistem Pekerjaan\n• 🎣 Mini Game Fishing\n• 🛡️ Tools Admin Lengkap\n\n📋 **Quick Menu** - Semua panel dalam satu tempat!')
        .setColor(0x00ff00)
        .setImage('https://cdn.discordapp.com/attachments/1403957950447484929/1405067752674299904/standard_3.gif')
        .setFooter({ text: 'NEBIX V20 VERSI UNGGULAN - Powered by Replit', iconURL: 'https://cdn.discordapp.com/attachments/1403957950447484929/1405067742461300736/standard_4.gif' })
        .setTimestamp();

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('panel_public')
                .setLabel('📢 Public Panel')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('panel_premium')
                .setLabel('💎 Premium Panel')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('panel_music')
                .setLabel('🎶 Music Panel')
                .setStyle(ButtonStyle.Secondary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('panel_bank')
                .setLabel('🏦 Bank Panel')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('panel_shop')
                .setLabel('🛒 Shop Panel')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('panel_ticket')
                .setLabel('🎫 Ticket Panel')
                .setStyle(ButtonStyle.Secondary)
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('panel_admin')
                .setLabel('⚔️ Admin Panel')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('panel_work')
                .setLabel('💼 Work Panel')
                .setStyle(ButtonStyle.Primary)
        );

    const row4 = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('language_select')
                .setPlaceholder('Pilih Bahasa / Select Language')
                .addOptions([
                    { label: '🇮🇩 Indonesia', value: 'id' },
                    { label: '🇺🇸 English', value: 'en' },
                    { label: '🇯🇵 Japanese', value: 'jp' },
                    { label: '🇰🇷 Korean', value: 'kr' },
                    { label: '🇫🇷 French', value: 'fr' }
                ])
        );

    const components = [row1, row2, row3, row4];

    // Add developer panel for authorized users
    if (await isDeveloper(userId, db)) {
        const devRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('panel_developer')
                    .setLabel('👑 Developer Panel V20')
                    .setStyle(ButtonStyle.Danger)
            );
        components.unshift(devRow);
    }

    return { embeds: [embed], components };
}

// Ready event
client.once('ready', async () => {
    console.log(`🤖 ${client.user.tag} is online!`);
    
    // Set bot status
    client.user.setActivity('🤖 NEBIX V5 | !help', { type: 'PLAYING' });
    
    // Initialize database tables
    await db.set('bot_stats', {
        totalUsers: 0,
        totalServers: client.guilds.cache.size,
        totalCommands: 0,
        uptime: Date.now()
    });

    // Initialize job openings
    for (const job of Object.keys(jobTypes)) {
        const isOpen = await db.get(`job_${job}_open`);
        if (isOpen === null) {
            await db.set(`job_${job}_open`, false);
        }
    }
});

// Message event for commands and XP system
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content.toLowerCase();
    
    // Help commands
    if (content === '!help' || content === '!hlp' || content === '!menu' || message.mentions.has(client.user)) {
        try {
            const menuData = await createMainMenu(message.author.username);
            await message.reply(menuData);
        } catch (error) {
            console.error('Error creating main menu:', error);
            await message.reply('❌ Terjadi kesalahan saat membuat menu!');
        }
        return;
    }

    // Enhanced XP system
    const userId = message.author.id;
    const currentXp = await db.get(`user_${userId}_xp`) || 0;
    const currentMoney = await db.get(`user_${userId}_money`) || 0;
    
    const xpGain = 100;
    const moneyGain = 100;
    
    await db.set(`user_${userId}_xp`, currentXp + xpGain);
    await db.set(`user_${userId}_money`, currentMoney + moneyGain);
});

// Voice state update for XP
client.on('voiceStateUpdate', async (oldState, newState) => {
    if (newState.member.bot) return;

    const userId = newState.member.id;
    
    if (!oldState.channel && newState.channel) {
        // User joined voice channel
        const currentXp = await db.get(`user_${userId}_xp`) || 0;
        const currentMoney = await db.get(`user_${userId}_money`) || 0;
        
        await db.set(`user_${userId}_xp`, currentXp + 100);
        await db.set(`user_${userId}_money`, currentMoney + 100);
    }
});

// Button interactions
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;

    try {
        // Language selection
        if (interaction.isStringSelectMenu() && interaction.customId === 'language_select') {
            const selectedLang = interaction.values[0];
            await db.set(`user_${interaction.user.id}_language`, selectedLang);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ Language Updated')
                .setDescription(`Language changed to ${interaction.values[0]}`)
                .setColor(0x00ff00);
                
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        // Panel buttons
        if (interaction.isButton()) {
            const { customId } = interaction;
            
            switch (customId) {
                case 'panel_public':
                    await handlePublicPanel(interaction);
                    break;
                case 'panel_premium':
                    await handlePremiumPanel(interaction);
                    break;
                case 'panel_music':
                    await handleMusicPanel(interaction);
                    break;
                case 'panel_bank':
                    await handleBankPanel(interaction);
                    break;
                case 'panel_shop':
                    await handleShopPanel(interaction);
                    break;
                case 'panel_ticket':
                    await handleTicketPanel(interaction);
                    break;
                case 'panel_admin':
                    await handleAdminPanel(interaction);
                    break;
                case 'panel_work':
                    await handleWorkPanel(interaction);
                    break;
                case 'panel_developer':
                    if (await isDeveloper(interaction.user.username, db)) {
                        await handleDeveloperPanel(interaction);
                    } else {
                        const embed = new EmbedBuilder()
                            .setTitle('❌ Access Denied')
                            .setDescription('**Anda bukan Developer!**\n\n👑 Panel developer hanya dapat diakses oleh developer yang terdaftar.\n\n📝 Developer terdaftar:\n• febiiiiiiiiiiii\n• tc_comunity\n• leio9734')
                            .setColor(0xff0000)
                            .setFooter({ text: 'Hubungi developer utama untuk mendapatkan akses' });
                        
                        await interaction.reply({ embeds: [embed], ephemeral: true });
                    }
                    break;
            }
        }

        // Handle button interactions from external handlers
        const buttonHandlers = require('./handlers/buttons.js');
        const modalHandlers = require('./handlers/modals.js');

        if (interaction.isButton() && buttonHandlers[interaction.customId]) {
            await buttonHandlers[interaction.customId](interaction, db);
        }

        // Handle quick toggle buttons
        if (interaction.isButton() && interaction.customId.startsWith('quick_toggle_')) {
            const jobName = interaction.customId.replace('quick_toggle_', '');
            if (buttonHandlers[interaction.customId]) {
                await buttonHandlers[interaction.customId](interaction, db);
            }
        }

        // Handle select menu interactions
        if (interaction.isStringSelectMenu() && buttonHandlers[interaction.customId]) {
            await buttonHandlers[interaction.customId](interaction, db);
        }

        if (interaction.isModalSubmit() && modalHandlers[interaction.customId]) {
            await modalHandlers[interaction.customId](interaction, db);
        }

    } catch (error) {
        console.error('Interaction error:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ An error occurred!', ephemeral: true }).catch(() => {});
        }
    }
});

// Panel handlers
async function handlePublicPanel(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('📢 PUBLIC PANEL')
        .setDescription('Pilih fitur publik yang tersedia')
        .setColor(0x0099ff);

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('public_redeem')
                .setLabel('🎁 Redeem Code')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('public_profile')
                .setLabel('👤 Profile')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('public_codes')
                .setLabel('📜 Check Codes')
                .setStyle(ButtonStyle.Secondary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('public_time_indonesia')
                .setLabel('🇮🇩 Indonesia Time')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('public_time_world')
                .setLabel('🌍 World Time')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('public_translate')
                .setLabel('🌐 Translate')
                .setStyle(ButtonStyle.Secondary)
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('public_quiz')
                .setLabel('🧠 Quiz')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('public_report')
                .setLabel('📝 Report')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.reply({ embeds: [embed], components: [row1, row2, row3], ephemeral: true });
}

async function handlePremiumPanel(interaction) {
    const userId = interaction.user.id;
    const isPremium = await db.get(`user_${userId}_premium`) || false;
    
    if (!isPremium && !isDeveloper(interaction.user.username)) {
        const modal = new ModalBuilder()
            .setCustomId('premium_code_modal')
            .setTitle('🔐 Premium Access Required');

        const codeInput = new TextInputBuilder()
            .setCustomId('premium_code')
            .setLabel('Enter Premium Code')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(codeInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('💎 PREMIUM PANEL')
        .setDescription('Welcome to Premium Features')
        .setColor(0xffd700);

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('premium_cpl')
                .setLabel('🎯 CPL System')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('premium_broadcast')
                .setLabel('📢 Broadcast')
                .setStyle(ButtonStyle.Primary)
        );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function handleMusicPanel(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🎶 MUSIC PANEL')
        .setDescription('Control music playback (YouTube Only)')
        .setColor(0xff69b4);

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('music_play')
                .setLabel('▶️ Play')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('music_pause')
                .setLabel('⏸️ Pause')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_stop')
                .setLabel('⏹️ Stop')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('music_skip')
                .setLabel('⏭️ Skip')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('music_loop')
                .setLabel('🔁 Loop')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_queue')
                .setLabel('📋 Queue')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('music_volume')
                .setLabel('🔊 Volume')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
}

async function handleBankPanel(interaction) {
    const userId = interaction.user.id;
    const balance = await db.get(`user_${userId}_money`) || 0;
    const userBank = await db.get(`user_${userId}_bank`);
    
    const embed = new EmbedBuilder()
        .setTitle('🏦 BANK PANEL')
        .setDescription(`💰 Saldo Anda: ${balance.toLocaleString()} IDR\n🏛️ Bank: ${userBank || 'Belum dipilih'}`)
        .setColor(0x00ff00);

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('bank_create')
                .setLabel('🏦 Create Bank Account')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('bank_balance')
                .setLabel('💰 Check Balance')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('bank_transfer')
                .setLabel('💸 Transfer')
                .setStyle(ButtonStyle.Success)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('bank_pin')
                .setLabel('🔒 Set PIN')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('bank_list_all')
                .setLabel('📋 List All Accounts')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('bank_manager')
                .setLabel('👨‍💼 Bank Manager')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
}

async function handleShopPanel(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🛒 SHOP PANEL')
        .setDescription('Beli berbagai item dengan IDR (Semua harga di atas 70.000 IDR)')
        .setColor(0xff6600);

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('shop_move')
                .setLabel('🎯 Move User (75.000 IDR)')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('shop_kick_voice')
                .setLabel('👠 Kick Voice (85.000 IDR)')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('shop_mute')
                .setLabel('🔇 Mute (90.000 IDR)')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('shop_fishing_rod')
                .setLabel('🎣 Fishing Rod (5.000 IDR)')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('shop_fishing_bait')
                .setLabel('🪱 Bait (3.000 IDR)')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('shop_premium')
                .setLabel('💎 Premium (1.000.000 IDR)')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
}

async function handleTicketPanel(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🎫 TICKET PANEL')
        .setDescription('Sistem tiket dan laporan')
        .setColor(0x9932cc);

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_create')
                .setLabel('🎫 Create Ticket')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('ticket_set_channel')
                .setLabel('⚙️ Set Ticket Channel')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function handleAdminPanel(interaction) {
    // Check if user is developer or has admin role
    const isDev = await isDeveloper(interaction.user.username, db);
    const hasAdminRole = interaction.member.roles.cache.some(role => 
        role.name.toLowerCase().includes('admin') || 
        role.permissions.has(PermissionFlagsBits.Administrator)
    );

    if (!isDev && !hasAdminRole) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Access Denied')
            .setDescription('**Anda bukan Administrator!**\n\n🔒 Panel admin hanya dapat diakses oleh:\n• 👑 Developer\n• ⚔️ User dengan role Admin\n• 🛡️ User dengan permission Administrator')
            .setColor(0xff0000)
            .setFooter({ text: 'Hubungi administrator untuk mendapatkan akses' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('⚔️ ADMIN PANEL')
        .setDescription('Panel administrasi server')
        .setColor(0xff4500);

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('admin_kick')
                .setLabel('👢 Kick User')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('admin_ban')
                .setLabel('🔨 Ban User')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('admin_mute')
                .setLabel('🔇 Mute User')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('admin_move')
                .setLabel('🎯 Move User')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('admin_announce')
                .setLabel('📢 Announce')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('admin_giveaway_small')
                .setLabel('🎁 Small Giveaway')
                .setStyle(ButtonStyle.Success)
        );

    await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
}

async function handleWorkPanel(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('💼 WORK PANEL')
        .setDescription('Panel pekerjaan dan karir')
        .setColor(0x8b4513);

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('work_apply')
                .setLabel('📝 Apply Job')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('work_list')
                .setLabel('📋 Job List')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('work_start')
                .setLabel('▶️ Start Work')
                .setStyle(ButtonStyle.Success)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('work_fishing')
                .setLabel('🎣 Go Fishing')
                .setStyle(ButtonStyle.Primary)
        );

    await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
}

async function handleDeveloperPanel(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('👑 DEVELOPER PANEL V20')
        .setDescription('**NEBIX V20 VERSI UNGGULAN - DEVELOPER CONTROL**\n\n![Banner](https://cdn.discordapp.com/attachments/1403957950447484929/1405067752674299904/standard_3.gif)\n\n🔥 Advanced developer features with global server management')
        .setColor(0xff0000)
        .setImage('https://cdn.discordapp.com/attachments/1403957950447484929/1405067752674299904/standard_3.gif');

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('dev_stats')
                .setLabel('📊 Bot Stats')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('dev_codes')
                .setLabel('🎫 Generate Codes')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('dev_broadcast')
                .setLabel('📢 Global Broadcast')
                .setStyle(ButtonStyle.Danger)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('dev_job_control')
                .setLabel('💼 Advanced Job Control')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('dev_giveaway_big')
                .setLabel('🎊 Big Giveaway')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('dev_custom_button')
                .setLabel('🔧 Custom Button')
                .setStyle(ButtonStyle.Secondary)
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('dev_set_global_report')
                .setLabel('🌐 Set Global Report')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('dev_create_role')
                .setLabel('👑 Create Role')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('dev_manage_devs')
                .setLabel('👨‍💻 Manage Developers')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.reply({ embeds: [embed], components: [row1, row2, row3], ephemeral: true });
}

// Error handling
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});

// Login
client.login(config.token);
