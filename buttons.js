

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { google } = require('googleapis');

// Time zones
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

const jobTypes = {
    'polisi': { permissions: [PermissionFlagsBits.MuteMembers, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.KickMembers], salary: 50000, color: 0x0000ff, roleName: 'Polisi' },
    'pemerintah': { permissions: [PermissionFlagsBits.Administrator], salary: 100000, color: 0xff0000, roleName: 'Pemerintah' },
    'dokter': { permissions: [], salary: 30000, color: 0x00ff00, roleName: 'Dokter' },
    'pemancing': { permissions: [], salary: 0, color: 0x00ffff, workable: true, roleName: 'Pemancing' },
    'pendam': { permissions: [], salary: 25000, color: 0xff9900, roleName: 'Pendam' },
    'adc': { permissions: [], salary: 40000, color: 0x9900ff, roleName: 'ADC' }
};

const indonesianBanks = [
    'Bank BRI', 'Bank Mandiri', 'Bank BCA', 'Bank BNI', 'Bank Kaltim',
    'Bank Danamon', 'Bank CIMB Niaga', 'Bank BTN', 'Bank Permata',
    'Bank Syariah Indonesia', 'Bank Mega', 'Bank Bukopin', 'Bank Maybank'
];

function generateCode(prefix, length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = prefix + '-';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Translation function using Google Translate API
async function translateText(text, fromLang, toLang) {
    try {
        const translate = google.translate('v2');
        const result = await translate.translations.list({
            auth: 'AIzaSyC8-85GNGJ5VfEkWZdcXVBezGNsk7mOt5Q',
            q: text,
            source: fromLang,
            target: toLang
        });
        return result.data.translations[0].translatedText;
    } catch (error) {
        return `[Translation Error: ${text}]`;
    }
}

function parseUserId(input) {
    const match = input.match(/(\d+)/);
    return match ? match[1] : null;
}

function parseChannelId(input) {
    const match = input.match(/(\d+)/);
    return match ? match[1] : null;
}

module.exports = {
    // Public Panel Buttons
    public_redeem: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('redeem_code_modal')
            .setTitle('🎁 Redeem Code');

        const codeInput = new TextInputBuilder()
            .setCustomId('redeem_code')
            .setLabel('Enter Code')
            .setPlaceholder('Example: NEBIX-JDG-IEG')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(codeInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    },

    public_profile: async (interaction, db) => {
        const userId = interaction.user.id;
        const balance = await db.get(`user_${userId}_money`) || 0;
        const xp = await db.get(`user_${userId}_xp`) || 0;
        const isPremium = await db.get(`user_${userId}_premium`) || false;
        const premiumExpiry = await db.get(`user_${userId}_premium_expiry`);
        const job = await db.get(`user_${userId}_job`);
        const bank = await db.get(`user_${userId}_bank`);

        let premiumStatus = '❌ Not Premium';
        if (isPremium && premiumExpiry) {
            const daysLeft = Math.ceil((premiumExpiry - Date.now()) / (1000 * 60 * 60 * 24));
            premiumStatus = `✅ Premium (${daysLeft} days left)`;
        }

        const embed = new EmbedBuilder()
            .setTitle(`👤 Profile - ${interaction.user.username}`)
            .addFields(
                { name: '💰 Balance', value: `${balance.toLocaleString()} IDR`, inline: true },
                { name: '⭐ XP', value: `${xp.toLocaleString()}`, inline: true },
                { name: '💎 Premium', value: premiumStatus, inline: true },
                { name: '💼 Job', value: job || 'Unemployed', inline: true },
                { name: '🏦 Bank', value: bank || 'No Bank', inline: true },
                { name: '📅 Joined', value: `<t:${Math.floor(interaction.user.createdTimestamp/1000)}:R>`, inline: true }
            )
            .setColor(0x00ff00)
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    public_codes: async (interaction, db) => {
        const codes = await db.get('active_codes') || {};
        const codeList = Object.entries(codes).map(([code, data]) => {
            const expiry = new Date(data.expiry);
            const now = new Date();
            const timeLeft = expiry - now;
            const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
            const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
            const minutesLeft = Math.ceil(timeLeft / (1000 * 60));
            
            let timeText = '';
            if (daysLeft > 1) timeText = `${daysLeft} days`;
            else if (hoursLeft > 1) timeText = `${hoursLeft} hours`;
            else timeText = `${minutesLeft} minutes`;
            
            return `**${code}**: ${data.reward} - Expires in ${timeText}`;
        }).join('\n') || 'No active codes available';

        const embed = new EmbedBuilder()
            .setTitle('📜 Active Redeem Codes')
            .setDescription(codeList)
            .setColor(0x0099ff)
            .setFooter({ text: 'Use public panel to redeem codes' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    public_time_indonesia: async (interaction, db) => {
        const times = Object.entries(indonesianTimeZones).map(([zone, tz]) => {
            const time = new Date().toLocaleString('id-ID', { 
                timeZone: tz,
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            return `**${zone}**: ${time}`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setTitle('🇮🇩 Indonesia Time Zones')
            .setDescription(times)
            .setColor(0xff0000)
            .setFooter({ text: 'Updated in real-time' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    public_time_world: async (interaction, db) => {
        const times = Object.entries(worldTimeZones).map(([city, tz]) => {
            const time = new Date().toLocaleString('en-US', { 
                timeZone: tz,
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            return `**${city}**: ${time}`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setTitle('🌍 World Time Zones')
            .setDescription(times)
            .setColor(0x00ff00)
            .setFooter({ text: 'Global time zones' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    public_translate: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('translate_modal')
            .setTitle('🌐 Advanced Translation');

        const textInput = new TextInputBuilder()
            .setCustomId('translate_text')
            .setLabel('Text to translate')
            .setPlaceholder('Enter any text in any language...')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(1000)
            .setRequired(true);

        const fromLangInput = new TextInputBuilder()
            .setCustomId('translate_from')
            .setLabel('From language (auto-detect if empty)')
            .setPlaceholder('id, en, jp, fr, etc. (leave empty for auto)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const toLangInput = new TextInputBuilder()
            .setCustomId('translate_to')
            .setLabel('To language')
            .setPlaceholder('en, id, jp, fr, es, de, etc.')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(textInput);
        const row2 = new ActionRowBuilder().addComponents(fromLangInput);
        const row3 = new ActionRowBuilder().addComponents(toLangInput);
        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
    },

    public_quiz: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('create_quiz_modal')
            .setTitle('🧠 Create Interactive Quiz');

        const titleInput = new TextInputBuilder()
            .setCustomId('quiz_title')
            .setLabel('Quiz Title')
            .setPlaceholder('Enter an interesting quiz title...')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const questionInput = new TextInputBuilder()
            .setCustomId('quiz_question')
            .setLabel('Question')
            .setPlaceholder('Write your quiz question here...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const answerInput = new TextInputBuilder()
            .setCustomId('quiz_answer')
            .setLabel('Correct Answer')
            .setPlaceholder('Enter the correct answer (case insensitive)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const rewardInput = new TextInputBuilder()
            .setCustomId('quiz_reward')
            .setLabel('Reward (IDR)')
            .setPlaceholder('Minimum 1000 IDR')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(titleInput);
        const row2 = new ActionRowBuilder().addComponents(questionInput);
        const row3 = new ActionRowBuilder().addComponents(answerInput);
        const row4 = new ActionRowBuilder().addComponents(rewardInput);
        modal.addComponents(row1, row2, row3, row4);

        await interaction.showModal(modal);
    },

    public_report: async (interaction, db) => {
        const globalReportGuild = await db.get('global_report_guild');
        const isEnabled = globalReportGuild ? true : false;
        
        const embed = new EmbedBuilder()
            .setTitle('📝 Global Report System')
            .setDescription('Send reports directly to developers')
            .setColor(isEnabled ? 0x00ff00 : 0x808080)
            .setFooter({ text: isEnabled ? 'Report system is active' : 'Report system not configured' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('report_bug')
                    .setLabel('🐛 Report Bug')
                    .setStyle(isEnabled ? ButtonStyle.Danger : ButtonStyle.Secondary)
                    .setDisabled(!isEnabled),
                new ButtonBuilder()
                    .setCustomId('report_ask')
                    .setLabel('❓ Ask Question')
                    .setStyle(isEnabled ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setDisabled(!isEnabled),
                new ButtonBuilder()
                    .setCustomId('report_suggestion')
                    .setLabel('💡 Suggestion')
                    .setStyle(isEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setDisabled(!isEnabled),
                new ButtonBuilder()
                    .setCustomId('report_help')
                    .setLabel('🆘 Help')
                    .setStyle(isEnabled ? ButtonStyle.Secondary : ButtonStyle.Secondary)
                    .setDisabled(!isEnabled)
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },

    // Bank Panel Buttons
    bank_create: async (interaction, db) => {
        const userId = interaction.user.id;
        const existingBank = await db.get(`user_${userId}_bank`);
        
        if (existingBank) {
            await interaction.reply({ 
                content: `❌ You already have a bank account with ${existingBank}!`, 
                ephemeral: true 
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('🏦 Create Bank Account')
            .setDescription('Choose your preferred Indonesian bank')
            .setColor(0x00ff00);

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('bank_select')
            .setPlaceholder('Choose a bank...')
            .addOptions(
                indonesianBanks.map(bank => ({
                    label: bank,
                    value: bank.toLowerCase().replace(/\s+/g, '_'),
                    description: `Create account with ${bank}`,
                    emoji: '🏛️'
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },

    bank_balance: async (interaction, db) => {
        const userId = interaction.user.id;
        const balance = await db.get(`user_${userId}_money`) || 0;
        const xp = await db.get(`user_${userId}_xp`) || 0;
        const bank = await db.get(`user_${userId}_bank`) || 'No bank selected';
        const accountCreated = await db.get(`user_${userId}_bank_created`) || Date.now();

        const embed = new EmbedBuilder()
            .setTitle('💰 Bank Account Information')
            .addFields(
                { name: '🏦 Bank', value: bank, inline: true },
                { name: '💵 Balance', value: `${balance.toLocaleString()} IDR`, inline: true },
                { name: '⭐ XP', value: `${xp.toLocaleString()}`, inline: true },
                { name: '📅 Account Created', value: `<t:${Math.floor(accountCreated/1000)}:R>`, inline: true },
                { name: '🆔 Account ID', value: userId, inline: true },
                { name: '📊 Account Status', value: '✅ Active', inline: true }
            )
            .setColor(0x00ff00)
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    bank_transfer: async (interaction, db) => {
        const userId = interaction.user.id;
        const userBank = await db.get(`user_${userId}_bank`);
        
        if (!userBank) {
            await interaction.reply({ 
                content: '❌ You need to create a bank account first!', 
                ephemeral: true 
            });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId('transfer_modal')
            .setTitle('💸 Bank Transfer');

        const recipientInput = new TextInputBuilder()
            .setCustomId('transfer_recipient')
            .setLabel('Recipient (User ID or @mention)')
            .setPlaceholder('123456789 or @username')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const amountInput = new TextInputBuilder()
            .setCustomId('transfer_amount')
            .setLabel('Amount (IDR)')
            .setPlaceholder('Minimum 1000 IDR')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const noteInput = new TextInputBuilder()
            .setCustomId('transfer_note')
            .setLabel('Transfer Note (optional)')
            .setPlaceholder('Payment for...')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const row1 = new ActionRowBuilder().addComponents(recipientInput);
        const row2 = new ActionRowBuilder().addComponents(amountInput);
        const row3 = new ActionRowBuilder().addComponents(noteInput);
        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
    },

    bank_pin: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('set_pin_modal')
            .setTitle('🔒 Set Bank PIN');

        const pinInput = new TextInputBuilder()
            .setCustomId('bank_pin')
            .setLabel('New 6-digit PIN')
            .setPlaceholder('Enter 6 digits')
            .setStyle(TextInputStyle.Short)
            .setMinLength(6)
            .setMaxLength(6)
            .setRequired(true);

        const confirmPinInput = new TextInputBuilder()
            .setCustomId('confirm_pin')
            .setLabel('Confirm PIN')
            .setPlaceholder('Re-enter 6 digits')
            .setStyle(TextInputStyle.Short)
            .setMinLength(6)
            .setMaxLength(6)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(pinInput);
        const row2 = new ActionRowBuilder().addComponents(confirmPinInput);
        modal.addComponents(row1, row2);

        await interaction.showModal(modal);
    },

    bank_list_all: async (interaction, db) => {
        const allUsers = [];
        const keys = await db.all();
        
        for (const item of keys) {
            if (item.id.includes('_money')) {
                const userId = item.id.split('_')[1];
                const balance = item.value;
                const bank = await db.get(`user_${userId}_bank`);
                
                if (bank) {
                    try {
                        const user = await interaction.client.users.fetch(userId);
                        allUsers.push(`**${user.username}** (${userId})\n💰 ${balance.toLocaleString()} IDR - 🏦 ${bank}`);
                    } catch {
                        allUsers.push(`**Unknown User** (${userId})\n💰 ${balance.toLocaleString()} IDR - 🏦 ${bank}`);
                    }
                }
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 All Bank Accounts')
            .setDescription(allUsers.join('\n\n') || 'No bank accounts found')
            .setColor(0x0099ff)
            .setFooter({ text: `Total accounts: ${allUsers.length}` });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    bank_manager: async (interaction, db) => {
        // Check if user is developer or has bank manager role
        const developers = await db.get('developers_list') || ['febiiiiiiiiiiii', 'tc_comunity', 'leio9734'];
        const isDev = developers.includes(interaction.user.username);
        const hasBankManagerRole = interaction.member.roles.cache.some(role => 
            role.name.toLowerCase().includes('bank') && role.name.toLowerCase().includes('manager')
        );
        const hasAdminPermission = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!isDev && !hasBankManagerRole && !hasAdminPermission) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Access Denied')
                .setDescription('**Anda bukan Bank Manager!**\n\n🏦 Panel Bank Manager hanya dapat diakses oleh:\n• 👑 Developer\n• 🏛️ User dengan role "Bank Manager"\n• ⚔️ User dengan permission Administrator\n\n💡 Hubungi administrator untuk mendapatkan role Bank Manager')
                .setColor(0xff0000)
                .setFooter({ text: 'Bank Manager Panel - Access Restricted' });

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('👨‍💼 Bank Manager Panel')
            .setDescription('Advanced bank management tools')
            .setColor(0xff6600);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('bank_freeze')
                    .setLabel('❄️ Freeze Account')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('bank_unfreeze')
                    .setLabel('🔥 Unfreeze Account')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('bank_create_redeem')
                    .setLabel('🎁 Create Money Code')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },

    // Shop Panel Buttons (Updated prices >70k)
    shop_premium: async (interaction, db) => {
        const userId = interaction.user.id;
        const balance = await db.get(`user_${userId}_money`) || 0;

        if (balance < 1000000) {
            await interaction.reply({ content: '❌ Insufficient balance! Need 1,000,000 IDR', ephemeral: true });
            return;
        }

        await db.set(`user_${userId}_money`, balance - 1000000);
        await db.set(`user_${userId}_premium`, true);
        await db.set(`user_${userId}_premium_expiry`, Date.now() + (30 * 24 * 60 * 60 * 1000));

        const embed = new EmbedBuilder()
            .setTitle('✅ Premium Purchased!')
            .setDescription('🎉 You now have premium access for 30 days!\n💰 -1,000,000 IDR deducted\n\n**Premium Benefits:**\n• Access to CPL System\n• Premium Broadcasting\n• Priority Support\n• Exclusive Features')
            .setColor(0xffd700);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    shop_fishing_rod: async (interaction, db) => {
        const userId = interaction.user.id;
        const balance = await db.get(`user_${userId}_money`) || 0;

        if (balance < 75000) {
            await interaction.reply({ content: '❌ Insufficient balance! Need 75,000 IDR', ephemeral: true });
            return;
        }

        await db.set(`user_${userId}_money`, balance - 75000);
        await db.set(`user_${userId}_fishing_rod`, true);

        const embed = new EmbedBuilder()
            .setTitle('✅ Professional Fishing Rod Purchased!')
            .setDescription('🎣 You can now go fishing!\n💰 -75,000 IDR deducted\n\n**Fishing Rod Features:**\n• Catch rare fish\n• Higher success rate\n• Durable equipment')
            .setColor(0x00ff00);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    shop_fishing_bait: async (interaction, db) => {
        const userId = interaction.user.id;
        const balance = await db.get(`user_${userId}_money`) || 0;

        if (balance < 85000) {
            await interaction.reply({ content: '❌ Insufficient balance! Need 85,000 IDR', ephemeral: true });
            return;
        }

        await db.set(`user_${userId}_money`, balance - 85000);
        const currentBait = await db.get(`user_${userId}_bait`) || 0;
        await db.set(`user_${userId}_bait`, currentBait + 50);

        const embed = new EmbedBuilder()
            .setTitle('✅ Premium Bait Pack Purchased!')
            .setDescription('🪱 You got 50 premium baits!\n💰 -85,000 IDR deducted\n\n**Premium Bait Benefits:**\n• Attract rare fish\n• Increased catch rate\n• Longer lasting')
            .setColor(0x00ff00);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    shop_move: async (interaction, db) => {
        const userId = interaction.user.id;
        const balance = await db.get(`user_${userId}_money`) || 0;

        if (balance < 75000) {
            await interaction.reply({ content: '❌ Insufficient balance! Need 75,000 IDR', ephemeral: true });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId('shop_move_modal')
            .setTitle('🎯 Move User Service');

        const userInput = new TextInputBuilder()
            .setCustomId('move_user_id')
            .setLabel('User to Move (ID or @mention)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const channelInput = new TextInputBuilder()
            .setCustomId('move_channel_id')
            .setLabel('Target Voice Channel (ID or #mention)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(userInput);
        const row2 = new ActionRowBuilder().addComponents(channelInput);
        modal.addComponents(row1, row2);

        await interaction.showModal(modal);
    },

    shop_kick_voice: async (interaction, db) => {
        const userId = interaction.user.id;
        const balance = await db.get(`user_${userId}_money`) || 0;

        if (balance < 85000) {
            await interaction.reply({ content: '❌ Insufficient balance! Need 85,000 IDR', ephemeral: true });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId('shop_kick_voice_modal')
            .setTitle('👠 Kick from Voice Service');

        const userInput = new TextInputBuilder()
            .setCustomId('kick_voice_user_id')
            .setLabel('User to Kick (ID or @mention)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const reasonInput = new TextInputBuilder()
            .setCustomId('kick_voice_reason')
            .setLabel('Reason (optional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const row1 = new ActionRowBuilder().addComponents(userInput);
        const row2 = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(row1, row2);

        await interaction.showModal(modal);
    },

    shop_mute: async (interaction, db) => {
        const userId = interaction.user.id;
        const balance = await db.get(`user_${userId}_money`) || 0;

        if (balance < 90000) {
            await interaction.reply({ content: '❌ Insufficient balance! Need 90,000 IDR', ephemeral: true });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId('shop_mute_modal')
            .setTitle('🔇 Mute User Service');

        const userInput = new TextInputBuilder()
            .setCustomId('mute_user_id')
            .setLabel('User to Mute (ID or @mention)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const durationInput = new TextInputBuilder()
            .setCustomId('mute_duration')
            .setLabel('Duration (minutes)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(userInput);
        const row2 = new ActionRowBuilder().addComponents(durationInput);
        modal.addComponents(row1, row2);

        await interaction.showModal(modal);
    },

    // Music Panel Buttons
    music_play: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('music_play_modal')
            .setTitle('🎵 Play YouTube Music');

        const urlInput = new TextInputBuilder()
            .setCustomId('youtube_url')
            .setLabel('YouTube URL or Search Query')
            .setPlaceholder('https://youtube.com/watch?v=... or song name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(urlInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    },

    music_pause: async (interaction, db) => {
        const embed = new EmbedBuilder()
            .setTitle('⏸️ Music Paused')
            .setDescription('Music playback has been paused')
            .setColor(0xffff00);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    music_stop: async (interaction, db) => {
        const embed = new EmbedBuilder()
            .setTitle('⏹️ Music Stopped')
            .setDescription('Music playback has been stopped and queue cleared')
            .setColor(0xff0000);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    music_skip: async (interaction, db) => {
        const embed = new EmbedBuilder()
            .setTitle('⏭️ Song Skipped')
            .setDescription('Skipped to next song in queue')
            .setColor(0x00ff00);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    music_queue: async (interaction, db) => {
        const embed = new EmbedBuilder()
            .setTitle('📋 Music Queue')
            .setDescription('No songs in queue')
            .setColor(0x0099ff);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    // Admin Panel Buttons
    admin_kick: async (interaction, db) => {
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            await interaction.reply({ content: '❌ You need Kick Members permission!', ephemeral: true });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId('admin_kick_modal')
            .setTitle('👢 Kick User');

        const userInput = new TextInputBuilder()
            .setCustomId('kick_user_id')
            .setLabel('User ID or @mention')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const reasonInput = new TextInputBuilder()
            .setCustomId('kick_reason')
            .setLabel('Reason')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        const row1 = new ActionRowBuilder().addComponents(userInput);
        const row2 = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(row1, row2);

        await interaction.showModal(modal);
    },

    admin_ban: async (interaction, db) => {
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            await interaction.reply({ content: '❌ You need Ban Members permission!', ephemeral: true });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId('admin_ban_modal')
            .setTitle('🔨 Ban User');

        const userInput = new TextInputBuilder()
            .setCustomId('ban_user_id')
            .setLabel('User ID or @mention')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const reasonInput = new TextInputBuilder()
            .setCustomId('ban_reason')
            .setLabel('Reason')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        const row1 = new ActionRowBuilder().addComponents(userInput);
        const row2 = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(row1, row2);

        await interaction.showModal(modal);
    },

    admin_mute: async (interaction, db) => {
        if (!interaction.member.permissions.has(PermissionFlagsBits.MuteMembers)) {
            await interaction.reply({ content: '❌ You need Mute Members permission!', ephemeral: true });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId('admin_mute_modal')
            .setTitle('🔇 Mute User');

        const userInput = new TextInputBuilder()
            .setCustomId('mute_user_id')
            .setLabel('User ID or @mention')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const durationInput = new TextInputBuilder()
            .setCustomId('mute_duration')
            .setLabel('Duration (minutes)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(userInput);
        const row2 = new ActionRowBuilder().addComponents(durationInput);
        modal.addComponents(row1, row2);

        await interaction.showModal(modal);
    },

    admin_move: async (interaction, db) => {
        if (!interaction.member.permissions.has(PermissionFlagsBits.MoveMembers)) {
            await interaction.reply({ content: '❌ You need Move Members permission!', ephemeral: true });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId('admin_move_modal')
            .setTitle('🎯 Move User');

        const userInput = new TextInputBuilder()
            .setCustomId('move_user_id')
            .setLabel('User ID or @mention')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const channelInput = new TextInputBuilder()
            .setCustomId('move_channel_id')
            .setLabel('Voice Channel ID or #mention')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(userInput);
        const row2 = new ActionRowBuilder().addComponents(channelInput);
        modal.addComponents(row1, row2);

        await interaction.showModal(modal);
    },

    admin_announce: async (interaction, db) => {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            await interaction.reply({ content: '❌ You need Manage Messages permission!', ephemeral: true });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId('admin_announce_modal')
            .setTitle('📢 Create Announcement');

        const titleInput = new TextInputBuilder()
            .setCustomId('announce_title')
            .setLabel('Announcement Title')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const messageInput = new TextInputBuilder()
            .setCustomId('announce_message')
            .setLabel('Announcement Message')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const channelInput = new TextInputBuilder()
            .setCustomId('announce_channel')
            .setLabel('Channel ID (optional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const row1 = new ActionRowBuilder().addComponents(titleInput);
        const row2 = new ActionRowBuilder().addComponents(messageInput);
        const row3 = new ActionRowBuilder().addComponents(channelInput);
        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
    },

    admin_giveaway_small: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('giveaway_small_modal')
            .setTitle('🎁 Small Server Giveaway');

        const titleInput = new TextInputBuilder()
            .setCustomId('giveaway_title')
            .setLabel('Giveaway Title')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const descInput = new TextInputBuilder()
            .setCustomId('giveaway_description')
            .setLabel('Description')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const prizeInput = new TextInputBuilder()
            .setCustomId('giveaway_prize')
            .setLabel('Prize')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const durationInput = new TextInputBuilder()
            .setCustomId('giveaway_duration')
            .setLabel('Duration (minutes)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(titleInput);
        const row2 = new ActionRowBuilder().addComponents(descInput);
        const row3 = new ActionRowBuilder().addComponents(prizeInput);
        const row4 = new ActionRowBuilder().addComponents(durationInput);
        modal.addComponents(row1, row2, row3, row4);

        await interaction.showModal(modal);
    },

    // Work Panel Buttons
    work_apply: async (interaction, db) => {
        const openJobs = [];
        for (const [job, data] of Object.entries(jobTypes)) {
            const isOpen = await db.get(`job_${job}_open`);
            if (isOpen) {
                openJobs.push({
                    label: job.toUpperCase(),
                    value: job,
                    description: `Salary: ${data.salary.toLocaleString()} IDR`,
                    emoji: job === 'polisi' ? '👮' : job === 'pemerintah' ? '🏛️' : job === 'dokter' ? '⚕️' : job === 'pemancing' ? '🎣' : '💼'
                });
            }
        }

        if (openJobs.length === 0) {
            await interaction.reply({ content: '❌ No job openings available! Contact administrators.', ephemeral: true });
            return;
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('job_apply_select')
            .setPlaceholder('Choose a job to apply...')
            .addOptions(openJobs);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({ 
            content: 'Select a job to apply for:', 
            components: [row], 
            ephemeral: true 
        });
    },

    work_list: async (interaction, db) => {
        const jobList = [];
        for (const [job, data] of Object.entries(jobTypes)) {
            const isOpen = await db.get(`job_${job}_open`);
            const status = isOpen ? '🟢 Open' : '⚫ Closed';
            const emoji = job === 'polisi' ? '👮' : job === 'pemerintah' ? '🏛️' : job === 'dokter' ? '⚕️' : job === 'pemancing' ? '🎣' : '💼';
            jobList.push(`${emoji} **${job.toUpperCase()}**: ${status} - Salary: ${data.salary.toLocaleString()} IDR`);
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Job Listings')
            .setDescription(jobList.join('\n'))
            .setColor(0x0099ff)
            .setFooter({ text: 'Apply for available jobs!' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    work_start: async (interaction, db) => {
        const userId = interaction.user.id;
        const job = await db.get(`user_${userId}_job`);
        const lastWork = await db.get(`user_${userId}_last_work`) || 0;
        const cooldown = 30 * 60 * 1000; // 30 minutes cooldown

        if (!job) {
            await interaction.reply({ content: '❌ You need to have a job first! Apply through work panel.', ephemeral: true });
            return;
        }

        if (Date.now() - lastWork < cooldown) {
            const timeLeft = Math.ceil((cooldown - (Date.now() - lastWork)) / (1000 * 60));
            await interaction.reply({ 
                content: `⏱️ You need to wait ${timeLeft} minutes before working again!`, 
                ephemeral: true 
            });
            return;
        }

        const jobData = jobTypes[job];
        const currentMoney = await db.get(`user_${userId}_money`) || 0;
        const currentXP = await db.get(`user_${userId}_xp`) || 0;
        
        await db.set(`user_${userId}_money`, currentMoney + jobData.salary);
        await db.set(`user_${userId}_xp`, currentXP + 200);
        await db.set(`user_${userId}_last_work`, Date.now());

        const embed = new EmbedBuilder()
            .setTitle('✅ Work Shift Completed!')
            .setDescription(`💼 You worked as **${job.toUpperCase()}**\n💰 Earned: ${jobData.salary.toLocaleString()} IDR\n⭐ Earned: 200 XP`)
            .setColor(jobData.color)
            .setFooter({ text: 'Good job! Come back in 30 minutes for next shift.' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    work_fishing: async (interaction, db) => {
        const userId = interaction.user.id;
        const hasFishingRod = await db.get(`user_${userId}_fishing_rod`) || false;
        const bait = await db.get(`user_${userId}_bait`) || 0;
        const job = await db.get(`user_${userId}_job`);

        if (job !== 'pemancing') {
            await interaction.reply({ content: '❌ You need to be a fisherman to go fishing!', ephemeral: true });
            return;
        }

        if (!hasFishingRod) {
            await interaction.reply({ content: '❌ You need a fishing rod! Buy one from the shop (75,000 IDR).', ephemeral: true });
            return;
        }

        if (bait < 1) {
            await interaction.reply({ content: '❌ You need bait! Buy some from the shop (85,000 IDR).', ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('🎣 Fishing in Progress...')
            .setDescription('🌊 Casting your line into the water...\n⏳ Please wait 10 seconds...')
            .setColor(0x00ffff);

        await interaction.reply({ embeds: [embed], ephemeral: true });

        // Fishing simulation
        setTimeout(async () => {
            const success = Math.random() > 0.2; // 80% success rate
            
            if (!success) {
                const failEmbed = new EmbedBuilder()
                    .setTitle('🎣 Fishing Failed')
                    .setDescription('🐟 The fish got away! Better luck next time.')
                    .setColor(0xff0000);
                
                await db.set(`user_${userId}_bait`, bait - 1);
                await interaction.editReply({ embeds: [failEmbed] });
                return;
            }

            const randomFish = fishTypes[Math.floor(Math.random() * fishTypes.length)];
            const currentMoney = await db.get(`user_${userId}_money`) || 0;
            const currentXP = await db.get(`user_${userId}_xp`) || 0;
            
            await db.set(`user_${userId}_money`, currentMoney + randomFish.price);
            await db.set(`user_${userId}_xp`, currentXP + 50);
            await db.set(`user_${userId}_bait`, bait - 1);

            const resultEmbed = new EmbedBuilder()
                .setTitle('🎣 Successful Catch!')
                .setDescription(`🐟 You caught a **${randomFish.name}**!\n💰 Sold for ${randomFish.price.toLocaleString()} IDR\n⭐ Gained 50 XP\n🪱 Bait remaining: ${bait - 1}`)
                .setColor(0x00ff00);

            await interaction.editReply({ embeds: [resultEmbed] });
        }, 10000);
    },

    // Ticket Panel
    ticket_create: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('ticket_create_modal')
            .setTitle('🎫 Create Support Ticket');

        const titleInput = new TextInputBuilder()
            .setCustomId('ticket_title')
            .setLabel('Ticket Title')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const descInput = new TextInputBuilder()
            .setCustomId('ticket_description')
            .setLabel('Description')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const categoryInput = new TextInputBuilder()
            .setCustomId('ticket_category')
            .setLabel('Category (support/bug/question)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(titleInput);
        const row2 = new ActionRowBuilder().addComponents(descInput);
        const row3 = new ActionRowBuilder().addComponents(categoryInput);
        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
    },

    ticket_set_channel: async (interaction, db) => {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            await interaction.reply({ content: '❌ You need Manage Channels permission!', ephemeral: true });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId('ticket_set_channel_modal')
            .setTitle('⚙️ Set Ticket Channel');

        const channelInput = new TextInputBuilder()
            .setCustomId('ticket_channel_id')
            .setLabel('Ticket Channel ID')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(channelInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    },

    // Developer Panel Buttons
    dev_stats: async (interaction, db) => {
        const stats = await db.get('bot_stats') || {};
        const uptime = Date.now() - (stats.uptime || Date.now());
        const uptimeHours = Math.floor(uptime / (1000 * 60 * 60));
        const uptimeMinutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

        // Get total users and premium users
        const allKeys = await db.all();
        let totalUsers = 0;
        let premiumUsers = 0;
        let totalMoney = 0;

        for (const item of allKeys) {
            if (item.id.includes('_money')) {
                totalUsers++;
                totalMoney += item.value;
            }
            if (item.id.includes('_premium') && item.value === true) {
                premiumUsers++;
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('📊 Bot Statistics')
            .addFields(
                { name: '🏠 Servers', value: `${interaction.client.guilds.cache.size}`, inline: true },
                { name: '👥 Total Users', value: `${totalUsers}`, inline: true },
                { name: '💎 Premium Users', value: `${premiumUsers}`, inline: true },
                { name: '⏰ Uptime', value: `${uptimeHours}h ${uptimeMinutes}m`, inline: true },
                { name: '🔗 Ping', value: `${interaction.client.ws.ping}ms`, inline: true },
                { name: '💰 Total Economy', value: `${totalMoney.toLocaleString()} IDR`, inline: true }
            )
            .setColor(0xff0000)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    dev_codes: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('dev_create_code_modal')
            .setTitle('🎫 Create Custom Redeem Code');

        const nameInput = new TextInputBuilder()
            .setCustomId('code_name')
            .setLabel('Code Name (e.g., NEBIX-JDG-IEG)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const typeInput = new TextInputBuilder()
            .setCustomId('code_type')
            .setLabel('Type (money/xp/premium/role)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const valueInput = new TextInputBuilder()
            .setCustomId('code_value')
            .setLabel('Value (amount or role name)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const durationInput = new TextInputBuilder()
            .setCustomId('code_duration')
            .setLabel('Duration (minutes, 0 for permanent)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(nameInput);
        const row2 = new ActionRowBuilder().addComponents(typeInput);
        const row3 = new ActionRowBuilder().addComponents(valueInput);
        const row4 = new ActionRowBuilder().addComponents(durationInput);
        modal.addComponents(row1, row2, row3, row4);

        await interaction.showModal(modal);
    },

    dev_job_control: async (interaction, db) => {
        const embed = new EmbedBuilder()
            .setTitle('💼 ADVANCED JOB CONTROL PANEL V20')
            .setDescription('**Global Job Management System**\n\n🌐 Manage job openings across ALL servers\n👥 Process applications from any server\n⏰ Set working hours and schedules\n🚫 Fire employees with automatic DM notifications\n📊 Full employee management')
            .setColor(0x0099ff);

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('job_toggle_openings')
                    .setLabel('🔄 Toggle Job Openings')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('job_view_applications')
                    .setLabel('📝 View Applications')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('job_set_hours')
                    .setLabel('⏰ Set Working Hours')
                    .setStyle(ButtonStyle.Secondary)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('job_fire_employee')
                    .setLabel('🔥 Fire Employee')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('job_manage_employees')
                    .setLabel('👥 Manage Employees')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('job_approve_applications')
                    .setLabel('✅ Approve Applications')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
    },

    dev_giveaway_big: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('giveaway_big_modal')
            .setTitle('🎊 Global Giveaway Event');

        const titleInput = new TextInputBuilder()
            .setCustomId('giveaway_title')
            .setLabel('Giveaway Title')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const descInput = new TextInputBuilder()
            .setCustomId('giveaway_description')
            .setLabel('Description')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const prizeInput = new TextInputBuilder()
            .setCustomId('giveaway_prize')
            .setLabel('Prize')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const durationInput = new TextInputBuilder()
            .setCustomId('giveaway_duration')
            .setLabel('Duration (minutes)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(titleInput);
        const row2 = new ActionRowBuilder().addComponents(descInput);
        const row3 = new ActionRowBuilder().addComponents(prizeInput);
        const row4 = new ActionRowBuilder().addComponents(durationInput);
        modal.addComponents(row1, row2, row3, row4);

        await interaction.showModal(modal);
    },

    dev_custom_button: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('custom_button_modal')
            .setTitle('🔧 Create Custom Public Button');

        const nameInput = new TextInputBuilder()
            .setCustomId('button_name')
            .setLabel('Button Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const titleInput = new TextInputBuilder()
            .setCustomId('button_title')
            .setLabel('Embed Title')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const descInput = new TextInputBuilder()
            .setCustomId('button_description')
            .setLabel('Description')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const linkInput = new TextInputBuilder()
            .setCustomId('button_link')
            .setLabel('Link (optional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const row1 = new ActionRowBuilder().addComponents(nameInput);
        const row2 = new ActionRowBuilder().addComponents(titleInput);
        const row3 = new ActionRowBuilder().addComponents(descInput);
        const row4 = new ActionRowBuilder().addComponents(linkInput);
        modal.addComponents(row1, row2, row3, row4);

        await interaction.showModal(modal);
    },

    dev_set_global_report: async (interaction, db) => {
        await db.set('global_report_guild', interaction.guild.id);
        
        // Create report channel
        let reportChannel = interaction.guild.channels.cache.find(c => c.name === 'global-reports');
        if (!reportChannel) {
            reportChannel = await interaction.guild.channels.create({
                name: 'global-reports',
                type: ChannelType.GuildText,
                topic: 'Global reports from all servers'
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('✅ Global Report System Configured')
            .setDescription(`Global report channel set to this server!\nReports will be sent to ${reportChannel}`)
            .setColor(0x00ff00);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    dev_create_role: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('create_role_modal')
            .setTitle('👑 Create Custom Role');

        const nameInput = new TextInputBuilder()
            .setCustomId('role_name')
            .setLabel('Role Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const colorInput = new TextInputBuilder()
            .setCustomId('role_color')
            .setLabel('Role Color (hex, e.g., #ff0000)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const permissionsInput = new TextInputBuilder()
            .setCustomId('role_permissions')
            .setLabel('Permissions (admin/mod/member)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const row1 = new ActionRowBuilder().addComponents(nameInput);
        const row2 = new ActionRowBuilder().addComponents(colorInput);
        const row3 = new ActionRowBuilder().addComponents(permissionsInput);
        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
    },

    dev_manage_devs: async (interaction, db) => {
        const embed = new EmbedBuilder()
            .setTitle('👨‍💻 Developer Management Panel')
            .setDescription('**Manage Developer Access**\n\nAdd or remove developers by Discord username')
            .setColor(0xff0000);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dev_add_developer')
                    .setLabel('➕ Add Developer')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('dev_remove_developer')
                    .setLabel('➖ Remove Developer')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('dev_list_developers')
                    .setLabel('📋 List Developers')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },

    dev_add_developer: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('add_developer_modal')
            .setTitle('➕ Add New Developer');

        const usernameInput = new TextInputBuilder()
            .setCustomId('dev_username')
            .setLabel('Discord Username')
            .setPlaceholder('username (without @)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(usernameInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    },

    dev_remove_developer: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('remove_developer_modal')
            .setTitle('➖ Remove Developer');

        const usernameInput = new TextInputBuilder()
            .setCustomId('dev_username_remove')
            .setLabel('Discord Username to Remove')
            .setPlaceholder('username (without @)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(usernameInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    },

    dev_list_developers: async (interaction, db) => {
        const developers = await db.get('developers_list') || ['febiiiiiiiiiiii', 'tc_comunity', 'leio9734'];
        
        const embed = new EmbedBuilder()
            .setTitle('📋 Developer List')
            .setDescription(`**Current Developers:**\n\n${developers.map((dev, index) => `${index + 1}. ${dev}`).join('\n')}`)
            .setColor(0x00ff00)
            .setFooter({ text: `Total: ${developers.length} developers` });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    // Quick toggle handler for job status
    [`quick_toggle_polisi`]: async (interaction, db) => {
        const currentStatus = await db.get(`job_polisi_open`) || false;
        const newStatus = !currentStatus;
        await db.set(`job_polisi_open`, newStatus);
        
        const embed = new EmbedBuilder()
            .setTitle('👮 POLISI Job Status Changed')
            .setDescription(`Job is now ${newStatus ? '🟢 OPEN' : '⚫ CLOSED'}`)
            .setColor(newStatus ? 0x00ff00 : 0xff0000);
        
        await interaction.update({ embeds: [embed], components: [] });
    },

    [`quick_toggle_pemerintah`]: async (interaction, db) => {
        const currentStatus = await db.get(`job_pemerintah_open`) || false;
        const newStatus = !currentStatus;
        await db.set(`job_pemerintah_open`, newStatus);
        
        const embed = new EmbedBuilder()
            .setTitle('🏛️ PEMERINTAH Job Status Changed')
            .setDescription(`Job is now ${newStatus ? '🟢 OPEN' : '⚫ CLOSED'}`)
            .setColor(newStatus ? 0x00ff00 : 0xff0000);
        
        await interaction.update({ embeds: [embed], components: [] });
    },

    [`quick_toggle_dokter`]: async (interaction, db) => {
        const currentStatus = await db.get(`job_dokter_open`) || false;
        const newStatus = !currentStatus;
        await db.set(`job_dokter_open`, newStatus);
        
        const embed = new EmbedBuilder()
            .setTitle('⚕️ DOKTER Job Status Changed')
            .setDescription(`Job is now ${newStatus ? '🟢 OPEN' : '⚫ CLOSED'}`)
            .setColor(newStatus ? 0x00ff00 : 0xff0000);
        
        await interaction.update({ embeds: [embed], components: [] });
    },

    [`quick_toggle_pemancing`]: async (interaction, db) => {
        const currentStatus = await db.get(`job_pemancing_open`) || false;
        const newStatus = !currentStatus;
        await db.set(`job_pemancing_open`, newStatus);
        
        const embed = new EmbedBuilder()
            .setTitle('🎣 PEMANCING Job Status Changed')
            .setDescription(`Job is now ${newStatus ? '🟢 OPEN' : '⚫ CLOSED'}`)
            .setColor(newStatus ? 0x00ff00 : 0xff0000);
        
        await interaction.update({ embeds: [embed], components: [] });
    },

    [`quick_toggle_pendam`]: async (interaction, db) => {
        const currentStatus = await db.get(`job_pendam_open`) || false;
        const newStatus = !currentStatus;
        await db.set(`job_pendam_open`, newStatus);
        
        const embed = new EmbedBuilder()
            .setTitle('💼 PENDAM Job Status Changed')
            .setDescription(`Job is now ${newStatus ? '🟢 OPEN' : '⚫ CLOSED'}`)
            .setColor(newStatus ? 0x00ff00 : 0xff0000);
        
        await interaction.update({ embeds: [embed], components: [] });
    },

    [`quick_toggle_adc`]: async (interaction, db) => {
        const currentStatus = await db.get(`job_adc_open`) || false;
        const newStatus = !currentStatus;
        await db.set(`job_adc_open`, newStatus);
        
        const embed = new EmbedBuilder()
            .setTitle('🎮 ADC Job Status Changed')
            .setDescription(`Job is now ${newStatus ? '🟢 OPEN' : '⚫ CLOSED'}`)
            .setColor(newStatus ? 0x00ff00 : 0xff0000);
        
        await interaction.update({ embeds: [embed], components: [] });
    },

    // New job control buttons
    job_toggle_openings: async (interaction, db) => {
        const options = Object.keys(jobTypes).map(job => ({
            label: `${job.toUpperCase()}`,
            value: `job_toggle_${job}`,
            description: `Toggle ${job} job opening`,
            emoji: job === 'polisi' ? '👮' : job === 'pemerintah' ? '🏛️' : job === 'dokter' ? '⚕️' : job === 'pemancing' ? '🎣' : '💼'
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('job_toggle_select')
            .setPlaceholder('Select job to toggle...')
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({ 
            content: '🔄 **Toggle Job Openings** - Select a job to open/close applications globally:', 
            components: [row], 
            ephemeral: true 
        });
    },

    job_view_applications: async (interaction, db) => {
        const applications = await db.get('pending_applications') || {};
        
        if (Object.keys(applications).length === 0) {
            await interaction.reply({ content: '📝 No pending applications found.', ephemeral: true });
            return;
        }

        let applicationsList = [];
        for (const [appId, data] of Object.entries(applications)) {
            applicationsList.push(`**${data.job.toUpperCase()}** - ${data.username} (${data.userId})\nServer: ${data.serverName}\nApplied: <t:${Math.floor(data.timestamp/1000)}:R>`);
        }

        const embed = new EmbedBuilder()
            .setTitle('📝 Pending Job Applications')
            .setDescription(applicationsList.join('\n\n'))
            .setColor(0x0099ff);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    job_set_hours: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('job_set_hours_modal')
            .setTitle('⏰ Set Working Hours');

        const jobInput = new TextInputBuilder()
            .setCustomId('job_type_hours')
            .setLabel('Job Type')
            .setPlaceholder('polisi, pemerintah, dokter, etc.')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const startInput = new TextInputBuilder()
            .setCustomId('work_start_hour')
            .setLabel('Start Hour (0-23)')
            .setPlaceholder('9 (for 9 AM)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const endInput = new TextInputBuilder()
            .setCustomId('work_end_hour')
            .setLabel('End Hour (0-23)')
            .setPlaceholder('17 (for 5 PM)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(jobInput);
        const row2 = new ActionRowBuilder().addComponents(startInput);
        const row3 = new ActionRowBuilder().addComponents(endInput);
        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
    },

    job_fire_employee: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('job_fire_employee_modal')
            .setTitle('🔥 Fire Employee');

        const userInput = new TextInputBuilder()
            .setCustomId('fire_user_id')
            .setLabel('User ID to Fire')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const reasonInput = new TextInputBuilder()
            .setCustomId('fire_reason')
            .setLabel('Reason for Termination')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(userInput);
        const row2 = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(row1, row2);

        await interaction.showModal(modal);
    },

    job_manage_employees: async (interaction, db) => {
        const employees = [];
        const allKeys = await db.all();
        
        for (const item of allKeys) {
            if (item.id.includes('_job') && item.value) {
                const userId = item.id.split('_')[1];
                try {
                    const user = await interaction.client.users.fetch(userId);
                    const job = item.value;
                    const lastWork = await db.get(`user_${userId}_last_work`) || 0;
                    const status = Date.now() - lastWork < 24 * 60 * 60 * 1000 ? '🟢 Active' : '🔴 Inactive';
                    
                    employees.push(`**${job.toUpperCase()}** - ${user.username} (${userId}) ${status}`);
                } catch (error) {
                    employees.push(`**${item.value.toUpperCase()}** - Unknown User (${userId}) 🔴 Inactive`);
                }
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('👥 Employee Management')
            .setDescription(employees.join('\n') || 'No employees found')
            .setColor(0x0099ff)
            .setFooter({ text: `Total employees: ${employees.length}` });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    job_approve_applications: async (interaction, db) => {
        const applications = await db.get('pending_applications') || {};
        
        if (Object.keys(applications).length === 0) {
            await interaction.reply({ content: '📝 No pending applications to approve.', ephemeral: true });
            return;
        }

        const options = Object.entries(applications).map(([appId, data]) => ({
            label: `${data.username} - ${data.job.toUpperCase()}`,
            value: `approve_${appId}`,
            description: `From ${data.serverName}`,
            emoji: data.job === 'polisi' ? '👮' : data.job === 'pemerintah' ? '🏛️' : data.job === 'dokter' ? '⚕️' : data.job === 'pemancing' ? '🎣' : '💼'
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('job_approve_select')
            .setPlaceholder('Select application to approve...')
            .addOptions(options.slice(0, 25)); // Discord limit

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({ 
            content: '✅ **Approve Applications** - Select an application to approve:', 
            components: [row], 
            ephemeral: true 
        });
    },

    dev_broadcast: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('global_broadcast_modal')
            .setTitle('📢 Global Broadcast');

        const titleInput = new TextInputBuilder()
            .setCustomId('broadcast_title')
            .setLabel('Announcement Title')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const messageInput = new TextInputBuilder()
            .setCustomId('broadcast_message')
            .setLabel('Announcement Message')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const mentionInput = new TextInputBuilder()
            .setCustomId('broadcast_mention')
            .setLabel('Mention (@everyone/@here or leave blank)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const row1 = new ActionRowBuilder().addComponents(titleInput);
        const row2 = new ActionRowBuilder().addComponents(messageInput);
        const row3 = new ActionRowBuilder().addComponents(mentionInput);
        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
    },

    // Report buttons
    report_bug: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('report_bug_modal')
            .setTitle('🐛 Report Bug');

        const titleInput = new TextInputBuilder()
            .setCustomId('bug_title')
            .setLabel('Bug Title')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const descInput = new TextInputBuilder()
            .setCustomId('bug_description')
            .setLabel('Bug Description')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const stepsInput = new TextInputBuilder()
            .setCustomId('bug_steps')
            .setLabel('Steps to Reproduce')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        const row1 = new ActionRowBuilder().addComponents(titleInput);
        const row2 = new ActionRowBuilder().addComponents(descInput);
        const row3 = new ActionRowBuilder().addComponents(stepsInput);
        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
    },

    report_ask: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('report_ask_modal')
            .setTitle('❓ Ask Question');

        const questionInput = new TextInputBuilder()
            .setCustomId('ask_question')
            .setLabel('Your Question')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const contextInput = new TextInputBuilder()
            .setCustomId('ask_context')
            .setLabel('Additional Context (optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        const row1 = new ActionRowBuilder().addComponents(questionInput);
        const row2 = new ActionRowBuilder().addComponents(contextInput);
        modal.addComponents(row1, row2);

        await interaction.showModal(modal);
    },

    report_suggestion: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('report_suggestion_modal')
            .setTitle('💡 Make Suggestion');

        const titleInput = new TextInputBuilder()
            .setCustomId('suggestion_title')
            .setLabel('Suggestion Title')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const descInput = new TextInputBuilder()
            .setCustomId('suggestion_description')
            .setLabel('Suggestion Description')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const benefitInput = new TextInputBuilder()
            .setCustomId('suggestion_benefit')
            .setLabel('How would this help?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        const row1 = new ActionRowBuilder().addComponents(titleInput);
        const row2 = new ActionRowBuilder().addComponents(descInput);
        const row3 = new ActionRowBuilder().addComponents(benefitInput);
        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
    },

    report_help: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('report_help_modal')
            .setTitle('🆘 Request Help');

        const issueInput = new TextInputBuilder()
            .setCustomId('help_issue')
            .setLabel('What do you need help with?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const urgencyInput = new TextInputBuilder()
            .setCustomId('help_urgency')
            .setLabel('Urgency (low/medium/high)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const row1 = new ActionRowBuilder().addComponents(issueInput);
        const row2 = new ActionRowBuilder().addComponents(urgencyInput);
        modal.addComponents(row1, row2);

        await interaction.showModal(modal);
    },

    // Bank select handler
    bank_select: async (interaction, db) => {
        if (!interaction.isStringSelectMenu()) return;
        
        const selectedBank = interaction.values[0];
        const bankName = indonesianBanks.find(bank => bank.toLowerCase().replace(/\s+/g, '_') === selectedBank);
        const userId = interaction.user.id;
        
        await db.set(`user_${userId}_bank`, bankName);
        await db.set(`user_${userId}_bank_created`, Date.now());
        
        // Generate random account number
        const accountNumber = Math.random().toString().slice(2, 14);
        await db.set(`user_${userId}_account_number`, accountNumber);
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Bank Account Created!')
            .setDescription(`🏦 **Bank:** ${bankName}\n🆔 **Account Number:** ${accountNumber}\n💰 **Initial Balance:** 0 IDR`)
            .setColor(0x00ff00)
            .setFooter({ text: 'Welcome to our banking services!' });
        
        await interaction.update({ embeds: [embed], components: [] });
    },

    // Job application handler
    job_apply_select: async (interaction, db) => {
        if (!interaction.isStringSelectMenu()) return;
        
        const selectedJob = interaction.values[0];
        const userId = interaction.user.id;
        const currentJob = await db.get(`user_${userId}_job`);
        
        if (currentJob) {
            await interaction.reply({ content: '❌ You already have a job! Contact administrator to change jobs.', ephemeral: true });
            return;
        }
        
        const jobData = jobTypes[selectedJob];
        await db.set(`user_${userId}_job`, selectedJob);
        
        // Create or assign role
        try {
            let role = interaction.guild.roles.cache.find(r => r.name === jobData.roleName);
            if (!role) {
                role = await interaction.guild.roles.create({
                    name: jobData.roleName,
                    color: jobData.color,
                    permissions: jobData.permissions,
                    reason: 'Job role creation'
                });
            }
            
            await interaction.member.roles.add(role);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ Job Application Approved!')
                .setDescription(`🎉 Welcome to your new position as **${selectedJob.toUpperCase()}**!\n💰 Salary: ${jobData.salary.toLocaleString()} IDR\n👔 Role assigned: ${role}`)
                .setColor(jobData.color)
                .setFooter({ text: 'You can now start working!' });
            
            await interaction.update({ embeds: [embed], components: [] });
        } catch (error) {
            await interaction.reply({ content: '❌ Failed to assign job role!', ephemeral: true });
        }
    },

    // Job toggle handler for developers
    job_toggle_select: async (interaction, db) => {
        if (!interaction.isStringSelectMenu()) return;
        
        const selectedValue = interaction.values[0];
        const jobName = selectedValue.replace('job_toggle_', '');
        const currentStatus = await db.get(`job_${jobName}_open`) || false;
        const newStatus = !currentStatus;
        
        await db.set(`job_${jobName}_open`, newStatus);
        
        const embed = new EmbedBuilder()
            .setTitle('💼 Job Status Updated Successfully!')
            .setDescription(`**${jobName.toUpperCase()}** job applications are now:\n\n${newStatus ? '🟢 **OPEN** - Users can apply for this position' : '⚫ **CLOSED** - Applications are temporarily suspended'}\n\n📊 **Status Change:** ${currentStatus ? 'Open' : 'Closed'} ➜ ${newStatus ? 'Open' : 'Closed'}\n⏰ **Updated:** <t:${Math.floor(Date.now()/1000)}:F>\n\n${newStatus ? '✅ Job seekers can now apply through the Work Panel' : '❌ New applications are blocked until reopened'}`)
            .setColor(newStatus ? 0x00ff00 : 0xff0000)
            .setTimestamp()
            .setFooter({ text: 'NEBIX V20 - Advanced Job Management System' });
        
        // Create new toggle button for quick status change
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`quick_toggle_${jobName}`)
                    .setLabel(`${newStatus ? 'Close' : 'Open'} ${jobName.toUpperCase()}`)
                    .setStyle(newStatus ? ButtonStyle.Danger : ButtonStyle.Success)
                    .setEmoji(newStatus ? '⚫' : '🟢')
            );
        
        await interaction.update({ embeds: [embed], components: [row] });
    },

    // Premium panel buttons
    premium_cpl: async (interaction, db) => {
        const embed = new EmbedBuilder()
            .setTitle('🎯 CPL System - Premium Feature')
            .setDescription('**CPL (Cost Per Lead) System**\n\n🎯 Track conversions and leads\n📊 Advanced analytics\n💰 Revenue optimization\n📈 Performance metrics')
            .setColor(0xffd700);
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('cpl_create_campaign')
                    .setLabel('📊 Create Campaign')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('cpl_view_stats')
                    .setLabel('📈 View Statistics')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },

    premium_broadcast: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('premium_broadcast_modal')
            .setTitle('📢 Premium Broadcast');

        const titleInput = new TextInputBuilder()
            .setCustomId('premium_title')
            .setLabel('Broadcast Title')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const messageInput = new TextInputBuilder()
            .setCustomId('premium_message')
            .setLabel('Message')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const targetInput = new TextInputBuilder()
            .setCustomId('premium_target')
            .setLabel('Target (server/premium/all)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(titleInput);
        const row2 = new ActionRowBuilder().addComponents(messageInput);
        const row3 = new ActionRowBuilder().addComponents(targetInput);
        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
    },

    // Ticket close handler
    ticket_close: async (interaction, db) => {
        if (!interaction.channel.name.startsWith('ticket-')) {
            await interaction.reply({ content: '❌ This is not a ticket channel!', ephemeral: true });
            return;
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🔒 Ticket Closed')
            .setDescription(`Ticket closed by ${interaction.user.username}`)
            .setColor(0xff0000)
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        
        // Delete channel after 5 seconds
        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (error) {
                console.log('Could not delete ticket channel');
            }
        }, 5000);
    },

    // Music control handlers
    music_loop: async (interaction, db) => {
        const embed = new EmbedBuilder()
            .setTitle('🔁 Loop Mode')
            .setDescription('Loop mode toggled for current song')
            .setColor(0x9932cc);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    music_volume: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('music_volume_modal')
            .setTitle('🔊 Set Volume');

        const volumeInput = new TextInputBuilder()
            .setCustomId('volume_level')
            .setLabel('Volume Level (0-100)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(volumeInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    },

    // Bank Management
    bank_freeze: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('bank_freeze_modal')
            .setTitle('❄️ Freeze Bank Account');

        const userInput = new TextInputBuilder()
            .setCustomId('freeze_user_id')
            .setLabel('User ID to freeze')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const reasonInput = new TextInputBuilder()
            .setCustomId('freeze_reason')
            .setLabel('Reason for freezing')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(userInput);
        const row2 = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(row1, row2);

        await interaction.showModal(modal);
    },

    bank_unfreeze: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('bank_unfreeze_modal')
            .setTitle('🔥 Unfreeze Bank Account');

        const userInput = new TextInputBuilder()
            .setCustomId('unfreeze_user_id')
            .setLabel('User ID to unfreeze')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(userInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    },

    bank_create_redeem: async (interaction, db) => {
        const modal = new ModalBuilder()
            .setCustomId('bank_redeem_modal')
            .setTitle('🎁 Create Money Redeem Code');

        const amountInput = new TextInputBuilder()
            .setCustomId('redeem_amount')
            .setLabel('Amount (IDR)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const codeNameInput = new TextInputBuilder()
            .setCustomId('redeem_code_name')
            .setLabel('Code Name (optional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const durationInput = new TextInputBuilder()
            .setCustomId('redeem_duration')
            .setLabel('Duration (hours, 0 for permanent)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(amountInput);
        const row2 = new ActionRowBuilder().addComponents(codeNameInput);
        const row3 = new ActionRowBuilder().addComponents(durationInput);
        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
    }
};
