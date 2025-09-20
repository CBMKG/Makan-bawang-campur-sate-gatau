
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const { google } = require('googleapis');

// Helper functions
function parseUserId(input) {
    const match = input.match(/(\d+)/);
    return match ? match[1] : null;
}

function parseChannelId(input) {
    const match = input.match(/(\d+)/);
    return match ? match[1] : null;
}

function generateCode(prefix, length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = prefix + '-';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const indonesianBanks = [
    'Bank BRI', 'Bank Mandiri', 'Bank BCA', 'Bank BNI', 'Bank Kaltim',
    'Bank Danamon', 'Bank CIMB Niaga', 'Bank BTN', 'Bank Permata',
    'Bank Syariah Indonesia', 'Bank Mega', 'Bank Bukopin', 'Bank Maybank'
];

const jobTypes = {
    'polisi': { permissions: [PermissionFlagsBits.MuteMembers, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.KickMembers], salary: 50000, color: 0x0000ff, roleName: 'Polisi' },
    'pemerintah': { permissions: [PermissionFlagsBits.Administrator], salary: 100000, color: 0xff0000, roleName: 'Pemerintah' },
    'dokter': { permissions: [], salary: 30000, color: 0x00ff00, roleName: 'Dokter' },
    'pemancing': { permissions: [], salary: 0, color: 0x00ffff, workable: true, roleName: 'Pemancing' },
    'pendam': { permissions: [], salary: 25000, color: 0xff9900, roleName: 'Pendam' },
    'adc': { permissions: [], salary: 40000, color: 0x9900ff, roleName: 'ADC' }
};

// Translation function
async function translateText(text, fromLang, toLang) {
    try {
        const translate = google.translate('v2');
        const result = await translate.translations.list({
            auth: 'AIzaSyC8-85GNGJ5VfEkWZdcXVBezGNsk7mOt5Q',
            q: text,
            source: fromLang || 'auto',
            target: toLang
        });
        return result.data.translations[0].translatedText;
    } catch (error) {
        return `[Translation Error: ${text}]`;
    }
}

module.exports = {
    // Premium Code Modal
    premium_code_modal: async (interaction, db) => {
        const code = interaction.fields.getTextInputValue('premium_code');
        const userId = interaction.user.id;
        
        if (code === 'APALU') {
            await db.set(`user_${userId}_premium`, true);
            await db.set(`user_${userId}_premium_expiry`, Date.now() + (30 * 24 * 60 * 60 * 1000));
            
            const embed = new EmbedBuilder()
                .setTitle('✅ Premium Activated!')
                .setDescription('🎉 You now have premium access for 30 days!')
                .setColor(0xffd700);
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            await interaction.reply({ content: '❌ Invalid premium code!', ephemeral: true });
        }
    },

    // Redeem Code Modal
    redeem_code_modal: async (interaction, db) => {
        const code = interaction.fields.getTextInputValue('redeem_code');
        const userId = interaction.user.id;
        const activeCodes = await db.get('active_codes') || {};
        
        if (activeCodes[code]) {
            const codeData = activeCodes[code];
            const now = Date.now();
            
            if (now > codeData.expiry) {
                await interaction.reply({ content: '❌ Code has expired!', ephemeral: true });
                return;
            }
            
            const usedCodes = await db.get(`user_${userId}_used_codes`) || [];
            if (usedCodes.includes(code)) {
                await interaction.reply({ content: '❌ You have already used this code!', ephemeral: true });
                return;
            }
            
            // Apply reward
            if (codeData.type === 'money') {
                const currentMoney = await db.get(`user_${userId}_money`) || 0;
                await db.set(`user_${userId}_money`, currentMoney + codeData.value);
            } else if (codeData.type === 'xp') {
                const currentXP = await db.get(`user_${userId}_xp`) || 0;
                await db.set(`user_${userId}_xp`, currentXP + codeData.value);
            } else if (codeData.type === 'premium') {
                await db.set(`user_${userId}_premium`, true);
                await db.set(`user_${userId}_premium_expiry`, Date.now() + (codeData.value * 24 * 60 * 60 * 1000));
            }
            
            usedCodes.push(code);
            await db.set(`user_${userId}_used_codes`, usedCodes);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ Code Redeemed Successfully!')
                .setDescription(`🎁 You received: ${codeData.reward}`)
                .setColor(0x00ff00);
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            await interaction.reply({ content: '❌ Invalid or expired code!', ephemeral: true });
        }
    },

    // Translation Modal
    translate_modal: async (interaction, db) => {
        const text = interaction.fields.getTextInputValue('translate_text');
        const fromLang = interaction.fields.getTextInputValue('translate_from') || 'auto';
        const toLang = interaction.fields.getTextInputValue('translate_to');
        
        const translatedText = await translateText(text, fromLang, toLang);
        
        const embed = new EmbedBuilder()
            .setTitle('🌐 Translation Result')
            .addFields(
                { name: `Original (${fromLang})`, value: text.substring(0, 1024), inline: false },
                { name: `Translated (${toLang})`, value: translatedText.substring(0, 1024), inline: false }
            )
            .setColor(0x0099ff)
            .setFooter({ text: 'Powered by Google Translate' });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    // Quiz Modal
    create_quiz_modal: async (interaction, db) => {
        const title = interaction.fields.getTextInputValue('quiz_title');
        const question = interaction.fields.getTextInputValue('quiz_question');
        const answer = interaction.fields.getTextInputValue('quiz_answer');
        const reward = parseInt(interaction.fields.getTextInputValue('quiz_reward'));
        
        if (reward < 1000) {
            await interaction.reply({ content: '❌ Minimum reward is 1000 IDR!', ephemeral: true });
            return;
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`🧠 ${title}`)
            .setDescription(`**Question:** ${question}\n\n💰 **Reward:** ${reward.toLocaleString()} IDR`)
            .setColor(0x9932cc)
            .setFooter({ text: 'First correct answer wins!' });
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`quiz_answer_${Date.now()}`)
                    .setLabel('Answer Quiz')
                    .setStyle(ButtonStyle.Primary)
            );
        
        await db.set(`quiz_${Date.now()}`, {
            question,
            answer: answer.toLowerCase(),
            reward,
            creator: interaction.user.id,
            active: true
        });
        
        await interaction.reply({ embeds: [embed], components: [row] });
    },

    // Bank Transfer Modal
    transfer_modal: async (interaction, db) => {
        const recipient = interaction.fields.getTextInputValue('transfer_recipient');
        const amount = parseInt(interaction.fields.getTextInputValue('transfer_amount'));
        const note = interaction.fields.getTextInputValue('transfer_note') || 'No note';
        
        const userId = interaction.user.id;
        const recipientId = parseUserId(recipient);
        
        if (!recipientId) {
            await interaction.reply({ content: '❌ Invalid recipient ID!', ephemeral: true });
            return;
        }
        
        if (amount < 1000) {
            await interaction.reply({ content: '❌ Minimum transfer amount is 1000 IDR!', ephemeral: true });
            return;
        }
        
        const senderBalance = await db.get(`user_${userId}_money`) || 0;
        if (senderBalance < amount) {
            await interaction.reply({ content: '❌ Insufficient balance!', ephemeral: true });
            return;
        }
        
        const recipientBalance = await db.get(`user_${recipientId}_money`) || 0;
        
        await db.set(`user_${userId}_money`, senderBalance - amount);
        await db.set(`user_${recipientId}_money`, recipientBalance + amount);
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Transfer Successful!')
            .addFields(
                { name: '💸 Amount', value: `${amount.toLocaleString()} IDR`, inline: true },
                { name: '📝 Note', value: note, inline: true },
                { name: '💰 New Balance', value: `${(senderBalance - amount).toLocaleString()} IDR`, inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
        // Notify recipient
        try {
            const recipientUser = await interaction.client.users.fetch(recipientId);
            const recipientEmbed = new EmbedBuilder()
                .setTitle('💰 Money Received!')
                .setDescription(`You received ${amount.toLocaleString()} IDR from ${interaction.user.username}`)
                .addField('📝 Note', note)
                .setColor(0x00ff00);
            
            await recipientUser.send({ embeds: [recipientEmbed] });
        } catch (error) {
            console.log('Could not notify recipient');
        }
    },

    // Set PIN Modal
    set_pin_modal: async (interaction, db) => {
        const pin = interaction.fields.getTextInputValue('bank_pin');
        const confirmPin = interaction.fields.getTextInputValue('confirm_pin');
        
        if (pin !== confirmPin) {
            await interaction.reply({ content: '❌ PINs do not match!', ephemeral: true });
            return;
        }
        
        if (!/^\d{6}$/.test(pin)) {
            await interaction.reply({ content: '❌ PIN must be exactly 6 digits!', ephemeral: true });
            return;
        }
        
        const userId = interaction.user.id;
        await db.set(`user_${userId}_pin`, pin);
        
        const embed = new EmbedBuilder()
            .setTitle('✅ PIN Set Successfully!')
            .setDescription('🔒 Your bank PIN has been updated securely')
            .setColor(0x00ff00);
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    // Music Play Modal
    music_play_modal: async (interaction, db) => {
        const url = interaction.fields.getTextInputValue('youtube_url');
        
        const embed = new EmbedBuilder()
            .setTitle('🎵 Music Player')
            .setDescription(`🎶 Playing: ${url}\n\n⏸️ Use music panel to control playback`)
            .setColor(0xff69b4);
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    // Shop Modals
    shop_move_modal: async (interaction, db) => {
        const userInput = interaction.fields.getTextInputValue('move_user_id');
        const channelInput = interaction.fields.getTextInputValue('move_channel_id');
        
        const userId = interaction.user.id;
        const balance = await db.get(`user_${userId}_money`) || 0;
        
        if (balance < 75000) {
            await interaction.reply({ content: '❌ Insufficient balance!', ephemeral: true });
            return;
        }
        
        const targetUserId = parseUserId(userInput);
        const targetChannelId = parseChannelId(channelInput);
        
        if (!targetUserId || !targetChannelId) {
            await interaction.reply({ content: '❌ Invalid user or channel ID!', ephemeral: true });
            return;
        }
        
        try {
            const member = await interaction.guild.members.fetch(targetUserId);
            const channel = await interaction.guild.channels.fetch(targetChannelId);
            
            if (!member.voice.channel) {
                await interaction.reply({ content: '❌ Target user is not in a voice channel!', ephemeral: true });
                return;
            }
            
            await member.voice.setChannel(channel);
            await db.set(`user_${userId}_money`, balance - 75000);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ User Moved Successfully!')
                .setDescription(`🎯 Moved ${member.user.username} to ${channel.name}\n💰 -75,000 IDR deducted`)
                .setColor(0x00ff00);
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: '❌ Failed to move user!', ephemeral: true });
        }
    },

    shop_kick_voice_modal: async (interaction, db) => {
        const userInput = interaction.fields.getTextInputValue('kick_voice_user_id');
        const reason = interaction.fields.getTextInputValue('kick_voice_reason') || 'No reason provided';
        
        const userId = interaction.user.id;
        const balance = await db.get(`user_${userId}_money`) || 0;
        
        if (balance < 85000) {
            await interaction.reply({ content: '❌ Insufficient balance!', ephemeral: true });
            return;
        }
        
        const targetUserId = parseUserId(userInput);
        
        try {
            const member = await interaction.guild.members.fetch(targetUserId);
            
            if (!member.voice.channel) {
                await interaction.reply({ content: '❌ Target user is not in a voice channel!', ephemeral: true });
                return;
            }
            
            await member.voice.disconnect(reason);
            await db.set(`user_${userId}_money`, balance - 85000);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ User Kicked from Voice!')
                .setDescription(`👠 Kicked ${member.user.username} from voice\n📝 Reason: ${reason}\n💰 -85,000 IDR deducted`)
                .setColor(0x00ff00);
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: '❌ Failed to kick user!', ephemeral: true });
        }
    },

    shop_mute_modal: async (interaction, db) => {
        const userInput = interaction.fields.getTextInputValue('mute_user_id');
        const duration = parseInt(interaction.fields.getTextInputValue('mute_duration'));
        
        const userId = interaction.user.id;
        const balance = await db.get(`user_${userId}_money`) || 0;
        
        if (balance < 90000) {
            await interaction.reply({ content: '❌ Insufficient balance!', ephemeral: true });
            return;
        }
        
        const targetUserId = parseUserId(userInput);
        
        try {
            const member = await interaction.guild.members.fetch(targetUserId);
            await member.timeout(duration * 60 * 1000, 'Paid mute service');
            await db.set(`user_${userId}_money`, balance - 90000);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ User Muted Successfully!')
                .setDescription(`🔇 Muted ${member.user.username} for ${duration} minutes\n💰 -90,000 IDR deducted`)
                .setColor(0x00ff00);
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: '❌ Failed to mute user!', ephemeral: true });
        }
    },

    // Admin Modals
    admin_kick_modal: async (interaction, db) => {
        const userInput = interaction.fields.getTextInputValue('kick_user_id');
        const reason = interaction.fields.getTextInputValue('kick_reason') || 'No reason provided';
        
        const targetUserId = parseUserId(userInput);
        
        try {
            const member = await interaction.guild.members.fetch(targetUserId);
            await member.kick(reason);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ User Kicked!')
                .setDescription(`👢 Kicked ${member.user.username}\n📝 Reason: ${reason}`)
                .setColor(0xff0000);
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: '❌ Failed to kick user!', ephemeral: true });
        }
    },

    admin_ban_modal: async (interaction, db) => {
        const userInput = interaction.fields.getTextInputValue('ban_user_id');
        const reason = interaction.fields.getTextInputValue('ban_reason') || 'No reason provided';
        
        const targetUserId = parseUserId(userInput);
        
        try {
            const member = await interaction.guild.members.fetch(targetUserId);
            await member.ban({ reason });
            
            const embed = new EmbedBuilder()
                .setTitle('✅ User Banned!')
                .setDescription(`🔨 Banned ${member.user.username}\n📝 Reason: ${reason}`)
                .setColor(0xff0000);
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: '❌ Failed to ban user!', ephemeral: true });
        }
    },

    admin_mute_modal: async (interaction, db) => {
        const userInput = interaction.fields.getTextInputValue('mute_user_id');
        const duration = parseInt(interaction.fields.getTextInputValue('mute_duration'));
        
        const targetUserId = parseUserId(userInput);
        
        try {
            const member = await interaction.guild.members.fetch(targetUserId);
            await member.timeout(duration * 60 * 1000, 'Admin mute');
            
            const embed = new EmbedBuilder()
                .setTitle('✅ User Muted!')
                .setDescription(`🔇 Muted ${member.user.username} for ${duration} minutes`)
                .setColor(0xff0000);
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: '❌ Failed to mute user!', ephemeral: true });
        }
    },

    admin_move_modal: async (interaction, db) => {
        const userInput = interaction.fields.getTextInputValue('move_user_id');
        const channelInput = interaction.fields.getTextInputValue('move_channel_id');
        
        const targetUserId = parseUserId(userInput);
        const targetChannelId = parseChannelId(channelInput);
        
        try {
            const member = await interaction.guild.members.fetch(targetUserId);
            const channel = await interaction.guild.channels.fetch(targetChannelId);
            
            await member.voice.setChannel(channel);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ User Moved!')
                .setDescription(`🎯 Moved ${member.user.username} to ${channel.name}`)
                .setColor(0x00ff00);
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: '❌ Failed to move user!', ephemeral: true });
        }
    },

    admin_announce_modal: async (interaction, db) => {
        const title = interaction.fields.getTextInputValue('announce_title');
        const message = interaction.fields.getTextInputValue('announce_message');
        const channelInput = interaction.fields.getTextInputValue('announce_channel');
        
        const embed = new EmbedBuilder()
            .setTitle(`📢 ${title}`)
            .setDescription(message)
            .setColor(0x0099ff)
            .setFooter({ text: `Announced by ${interaction.user.username}` })
            .setTimestamp();
        
        let targetChannel = interaction.channel;
        if (channelInput) {
            const channelId = parseChannelId(channelInput);
            if (channelId) {
                targetChannel = await interaction.guild.channels.fetch(channelId);
            }
        }
        
        await targetChannel.send({ embeds: [embed] });
        await interaction.reply({ content: '✅ Announcement sent!', ephemeral: true });
    },

    giveaway_small_modal: async (interaction, db) => {
        const title = interaction.fields.getTextInputValue('giveaway_title');
        const description = interaction.fields.getTextInputValue('giveaway_description');
        const prize = interaction.fields.getTextInputValue('giveaway_prize');
        const duration = parseInt(interaction.fields.getTextInputValue('giveaway_duration'));
        
        const embed = new EmbedBuilder()
            .setTitle(`🎁 ${title}`)
            .setDescription(`${description}\n\n🏆 **Prize:** ${prize}\n⏰ **Duration:** ${duration} minutes`)
            .setColor(0x9932cc)
            .setFooter({ text: 'React with 🎉 to participate!' })
            .setTimestamp();
        
        const message = await interaction.reply({ embeds: [embed], fetchReply: true });
        await message.react('🎉');
        
        // Set giveaway end timer
        setTimeout(async () => {
            try {
                const updatedMessage = await message.fetch();
                const reaction = updatedMessage.reactions.cache.get('🎉');
                
                if (reaction && reaction.count > 1) {
                    const users = await reaction.users.fetch();
                    const participants = users.filter(user => !user.bot);
                    
                    if (participants.size > 0) {
                        const winner = participants.random();
                        
                        const winnerEmbed = new EmbedBuilder()
                            .setTitle('🎉 Giveaway Winner!')
                            .setDescription(`Congratulations ${winner}! You won **${prize}**!`)
                            .setColor(0x00ff00);
                        
                        await interaction.followUp({ embeds: [winnerEmbed] });
                    }
                }
            } catch (error) {
                console.error('Giveaway error:', error);
            }
        }, duration * 60 * 1000);
    },

    // Developer Modals
    dev_create_code_modal: async (interaction, db) => {
        const codeName = interaction.fields.getTextInputValue('code_name');
        const type = interaction.fields.getTextInputValue('code_type');
        const value = interaction.fields.getTextInputValue('code_value');
        const duration = parseInt(interaction.fields.getTextInputValue('code_duration'));
        
        const activeCodes = await db.get('active_codes') || {};
        const expiry = duration === 0 ? Date.now() + (365 * 24 * 60 * 60 * 1000) : Date.now() + (duration * 60 * 1000);
        
        let reward = '';
        let parsedValue = value;
        
        if (type === 'money' || type === 'xp') {
            parsedValue = parseInt(value);
            reward = `${parsedValue.toLocaleString()} ${type.toUpperCase()}`;
        } else if (type === 'premium') {
            parsedValue = parseInt(value);
            reward = `${parsedValue} days Premium`;
        } else {
            reward = value;
        }
        
        activeCodes[codeName] = {
            type,
            value: parsedValue,
            reward,
            expiry,
            creator: interaction.user.username
        };
        
        await db.set('active_codes', activeCodes);
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Code Created Successfully!')
            .addFields(
                { name: '🎫 Code', value: codeName, inline: true },
                { name: '🎁 Reward', value: reward, inline: true },
                { name: '⏰ Expires', value: duration === 0 ? 'Never' : `${duration} minutes`, inline: true }
            )
            .setColor(0x00ff00);
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    giveaway_big_modal: async (interaction, db) => {
        const title = interaction.fields.getTextInputValue('giveaway_title');
        const description = interaction.fields.getTextInputValue('giveaway_description');
        const prize = interaction.fields.getTextInputValue('giveaway_prize');
        const duration = parseInt(interaction.fields.getTextInputValue('giveaway_duration'));
        
        const embed = new EmbedBuilder()
            .setTitle(`🎊 GLOBAL GIVEAWAY: ${title}`)
            .setDescription(`${description}\n\n🏆 **Grand Prize:** ${prize}\n⏰ **Duration:** ${duration} minutes\n\n🌟 This is a special global event!`)
            .setColor(0xffd700)
            .setFooter({ text: 'React with 🎊 to participate in this global event!' })
            .setTimestamp();
        
        // Send to all servers
        for (const guild of interaction.client.guilds.cache.values()) {
            try {
                const channel = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me).has('SendMessages'));
                if (channel) {
                    const message = await channel.send({ embeds: [embed] });
                    await message.react('🎊');
                }
            } catch (error) {
                console.log(`Could not send giveaway to ${guild.name}`);
            }
        }
        
        await interaction.reply({ content: '✅ Global giveaway broadcasted to all servers!', ephemeral: true });
    },

    custom_button_modal: async (interaction, db) => {
        const name = interaction.fields.getTextInputValue('button_name');
        const title = interaction.fields.getTextInputValue('button_title');
        const description = interaction.fields.getTextInputValue('button_description');
        const link = interaction.fields.getTextInputValue('button_link');
        
        const embed = new EmbedBuilder()
            .setTitle(`🔧 ${title}`)
            .setDescription(description)
            .setColor(0x9932cc)
            .setFooter({ text: `Custom feature created by ${interaction.user.username}` });
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`custom_${name.toLowerCase().replace(/\s+/g, '_')}`)
                    .setLabel(name)
                    .setStyle(ButtonStyle.Primary)
            );
        
        if (link) {
            row.addComponents(
                new ButtonBuilder()
                    .setURL(link)
                    .setLabel('Learn More')
                    .setStyle(ButtonStyle.Link)
            );
        }
        
        await interaction.reply({ embeds: [embed], components: [row] });
    },

    global_broadcast_modal: async (interaction, db) => {
        const title = interaction.fields.getTextInputValue('broadcast_title');
        const message = interaction.fields.getTextInputValue('broadcast_message');
        const mention = interaction.fields.getTextInputValue('broadcast_mention');
        
        const embed = new EmbedBuilder()
            .setTitle(`📢 GLOBAL ANNOUNCEMENT: ${title}`)
            .setDescription(message)
            .setColor(0xff0000)
            .setFooter({ text: `Broadcast by ${interaction.user.username}` })
            .setTimestamp();
        
        let sentCount = 0;
        
        for (const guild of interaction.client.guilds.cache.values()) {
            try {
                const channel = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me).has('SendMessages'));
                if (channel) {
                    const content = mention ? mention : '';
                    await channel.send({ content, embeds: [embed] });
                    sentCount++;
                }
            } catch (error) {
                console.log(`Could not broadcast to ${guild.name}`);
            }
        }
        
        await interaction.reply({ 
            content: `✅ Global broadcast sent to ${sentCount} servers!`, 
            ephemeral: true 
        });
    },

    create_role_modal: async (interaction, db) => {
        const name = interaction.fields.getTextInputValue('role_name');
        const color = interaction.fields.getTextInputValue('role_color') || '#99aab5';
        const permissions = interaction.fields.getTextInputValue('role_permissions') || 'member';
        
        let rolePermissions = [];
        
        if (permissions.toLowerCase() === 'admin') {
            rolePermissions = [PermissionFlagsBits.Administrator];
        } else if (permissions.toLowerCase() === 'mod') {
            rolePermissions = [
                PermissionFlagsBits.KickMembers,
                PermissionFlagsBits.BanMembers,
                PermissionFlagsBits.MuteMembers,
                PermissionFlagsBits.ManageMessages
            ];
        }
        
        try {
            const role = await interaction.guild.roles.create({
                name: name,
                color: color,
                permissions: rolePermissions,
                reason: `Created by ${interaction.user.username} via developer panel`
            });
            
            const embed = new EmbedBuilder()
                .setTitle('✅ Role Created Successfully!')
                .setDescription(`👑 Created role: ${role}\n🎨 Color: ${color}\n⚡ Permissions: ${permissions}`)
                .setColor(role.color);
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: '❌ Failed to create role!', ephemeral: true });
        }
    },

    // Report Modals
    report_bug_modal: async (interaction, db) => {
        const title = interaction.fields.getTextInputValue('bug_title');
        const description = interaction.fields.getTextInputValue('bug_description');
        const steps = interaction.fields.getTextInputValue('bug_steps') || 'Not provided';
        
        const globalReportGuild = await db.get('global_report_guild');
        
        if (!globalReportGuild) {
            await interaction.reply({ content: '❌ Global report system not configured!', ephemeral: true });
            return;
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`🐛 Bug Report: ${title}`)
            .setDescription(description)
            .addFields(
                { name: '📋 Steps to Reproduce', value: steps },
                { name: '👤 Reporter', value: `${interaction.user.username} (${interaction.user.id})` },
                { name: '🏠 Server', value: `${interaction.guild.name} (${interaction.guild.id})` }
            )
            .setColor(0xff0000)
            .setTimestamp();
        
        try {
            const reportGuild = await interaction.client.guilds.fetch(globalReportGuild);
            const reportChannel = reportGuild.channels.cache.find(c => c.name === 'global-reports');
            
            if (reportChannel) {
                await reportChannel.send({ embeds: [embed] });
                await interaction.reply({ content: '✅ Bug report sent to developers!', ephemeral: true });
            }
        } catch (error) {
            await interaction.reply({ content: '❌ Failed to send report!', ephemeral: true });
        }
    },

    report_ask_modal: async (interaction, db) => {
        const question = interaction.fields.getTextInputValue('ask_question');
        const context = interaction.fields.getTextInputValue('ask_context') || 'No additional context';
        
        const globalReportGuild = await db.get('global_report_guild');
        
        if (!globalReportGuild) {
            await interaction.reply({ content: '❌ Global report system not configured!', ephemeral: true });
            return;
        }
        
        const embed = new EmbedBuilder()
            .setTitle('❓ Question from User')
            .setDescription(question)
            .addFields(
                { name: '📋 Additional Context', value: context },
                { name: '👤 Asked by', value: `${interaction.user.username} (${interaction.user.id})` },
                { name: '🏠 Server', value: `${interaction.guild.name} (${interaction.guild.id})` }
            )
            .setColor(0x0099ff)
            .setTimestamp();
        
        try {
            const reportGuild = await interaction.client.guilds.fetch(globalReportGuild);
            const reportChannel = reportGuild.channels.cache.find(c => c.name === 'global-reports');
            
            if (reportChannel) {
                await reportChannel.send({ embeds: [embed] });
                await interaction.reply({ content: '✅ Question sent to developers!', ephemeral: true });
            }
        } catch (error) {
            await interaction.reply({ content: '❌ Failed to send question!', ephemeral: true });
        }
    },

    report_suggestion_modal: async (interaction, db) => {
        const title = interaction.fields.getTextInputValue('suggestion_title');
        const description = interaction.fields.getTextInputValue('suggestion_description');
        const benefit = interaction.fields.getTextInputValue('suggestion_benefit') || 'Not specified';
        
        const globalReportGuild = await db.get('global_report_guild');
        
        if (!globalReportGuild) {
            await interaction.reply({ content: '❌ Global report system not configured!', ephemeral: true });
            return;
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`💡 Suggestion: ${title}`)
            .setDescription(description)
            .addFields(
                { name: '🎯 How would this help?', value: benefit },
                { name: '👤 Suggested by', value: `${interaction.user.username} (${interaction.user.id})` },
                { name: '🏠 Server', value: `${interaction.guild.name} (${interaction.guild.id})` }
            )
            .setColor(0x00ff00)
            .setTimestamp();
        
        try {
            const reportGuild = await interaction.client.guilds.fetch(globalReportGuild);
            const reportChannel = reportGuild.channels.cache.find(c => c.name === 'global-reports');
            
            if (reportChannel) {
                await reportChannel.send({ embeds: [embed] });
                await interaction.reply({ content: '✅ Suggestion sent to developers!', ephemeral: true });
            }
        } catch (error) {
            await interaction.reply({ content: '❌ Failed to send suggestion!', ephemeral: true });
        }
    },

    report_help_modal: async (interaction, db) => {
        const issue = interaction.fields.getTextInputValue('help_issue');
        const urgency = interaction.fields.getTextInputValue('help_urgency') || 'medium';
        
        const globalReportGuild = await db.get('global_report_guild');
        
        if (!globalReportGuild) {
            await interaction.reply({ content: '❌ Global report system not configured!', ephemeral: true });
            return;
        }
        
        const urgencyColor = urgency.toLowerCase() === 'high' ? 0xff0000 : urgency.toLowerCase() === 'low' ? 0x00ff00 : 0xffff00;
        
        const embed = new EmbedBuilder()
            .setTitle('🆘 Help Request')
            .setDescription(issue)
            .addFields(
                { name: '🚨 Urgency', value: urgency.toUpperCase(), inline: true },
                { name: '👤 Requested by', value: `${interaction.user.username} (${interaction.user.id})`, inline: true },
                { name: '🏠 Server', value: `${interaction.guild.name} (${interaction.guild.id})`, inline: true }
            )
            .setColor(urgencyColor)
            .setTimestamp();
        
        try {
            const reportGuild = await interaction.client.guilds.fetch(globalReportGuild);
            const reportChannel = reportGuild.channels.cache.find(c => c.name === 'global-reports');
            
            if (reportChannel) {
                await reportChannel.send({ embeds: [embed] });
                await interaction.reply({ content: '✅ Help request sent to developers!', ephemeral: true });
            }
        } catch (error) {
            await interaction.reply({ content: '❌ Failed to send help request!', ephemeral: true });
        }
    },

    // Ticket Modals
    ticket_create_modal: async (interaction, db) => {
        const title = interaction.fields.getTextInputValue('ticket_title');
        const description = interaction.fields.getTextInputValue('ticket_description');
        const category = interaction.fields.getTextInputValue('ticket_category');
        
        const ticketId = `ticket-${Date.now()}`;
        
        try {
            const ticketChannel = await interaction.guild.channels.create({
                name: ticketId,
                type: ChannelType.GuildText,
                topic: `Ticket: ${title} - ${interaction.user.username}`,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                    }
                ]
            });
            
            const embed = new EmbedBuilder()
                .setTitle(`🎫 Ticket: ${title}`)
                .setDescription(description)
                .addFields(
                    { name: '📂 Category', value: category, inline: true },
                    { name: '👤 Created by', value: interaction.user.username, inline: true },
                    { name: '🆔 Ticket ID', value: ticketId, inline: true }
                )
                .setColor(0x9932cc)
                .setTimestamp();
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_close')
                        .setLabel('🔒 Close Ticket')
                        .setStyle(ButtonStyle.Danger)
                );
            
            await ticketChannel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ 
                content: `✅ Ticket created! Check ${ticketChannel}`, 
                ephemeral: true 
            });
        } catch (error) {
            await interaction.reply({ content: '❌ Failed to create ticket!', ephemeral: true });
        }
    },

    ticket_set_channel_modal: async (interaction, db) => {
        const channelId = interaction.fields.getTextInputValue('ticket_channel_id');
        
        try {
            const channel = await interaction.guild.channels.fetch(channelId);
            await db.set(`guild_${interaction.guild.id}_ticket_channel`, channelId);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ Ticket Channel Set!')
                .setDescription(`🎫 Tickets will be created in category: ${channel.name}`)
                .setColor(0x00ff00);
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: '❌ Invalid channel ID!', ephemeral: true });
        }
    },

    // Bank Management Modals
    bank_freeze_modal: async (interaction, db) => {
        const userId = interaction.fields.getTextInputValue('freeze_user_id');
        const reason = interaction.fields.getTextInputValue('freeze_reason');
        
        const targetUserId = parseUserId(userId);
        
        await db.set(`user_${targetUserId}_bank_frozen`, true);
        await db.set(`user_${targetUserId}_freeze_reason`, reason);
        
        const embed = new EmbedBuilder()
            .setTitle('❄️ Account Frozen')
            .setDescription(`Bank account for user ${targetUserId} has been frozen.\n\n**Reason:** ${reason}`)
            .setColor(0x87ceeb);
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    // Premium broadcast modal
    premium_broadcast_modal: async (interaction, db) => {
        const title = interaction.fields.getTextInputValue('premium_title');
        const message = interaction.fields.getTextInputValue('premium_message');
        const target = interaction.fields.getTextInputValue('premium_target').toLowerCase();
        
        const embed = new EmbedBuilder()
            .setTitle(`💎 PREMIUM BROADCAST: ${title}`)
            .setDescription(message)
            .setColor(0xffd700)
            .setFooter({ text: `Premium broadcast by ${interaction.user.username}` })
            .setTimestamp();
        
        let sentCount = 0;
        
        if (target === 'all' || target === 'server') {
            // Send to current server
            const channel = interaction.guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.permissionsFor(interaction.guild.members.me).has('SendMessages'));
            if (channel) {
                await channel.send({ embeds: [embed] });
                sentCount++;
            }
        }
        
        if (target === 'all' || target === 'premium') {
            // Send to premium users
            const allKeys = await db.all();
            for (const item of allKeys) {
                if (item.id.includes('_premium') && item.value === true) {
                    const userId = item.id.split('_')[1];
                    try {
                        const user = await interaction.client.users.fetch(userId);
                        await user.send({ embeds: [embed] });
                        sentCount++;
                    } catch (error) {
                        console.log(`Could not send to premium user ${userId}`);
                    }
                }
            }
        }
        
        await interaction.reply({
            content: `✅ Premium broadcast sent to ${sentCount} targets!`,
            ephemeral: true
        });
    },

    // Music volume modal
    music_volume_modal: async (interaction, db) => {
        const volume = parseInt(interaction.fields.getTextInputValue('volume_level'));
        
        if (volume < 0 || volume > 100) {
            await interaction.reply({ content: '❌ Volume must be between 0-100!', ephemeral: true });
            return;
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🔊 Volume Updated')
            .setDescription(`Volume set to ${volume}%`)
            .setColor(0x00ff00);
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    bank_unfreeze_modal: async (interaction, db) => {
        const userId = interaction.fields.getTextInputValue('unfreeze_user_id');
        const targetUserId = parseUserId(userId);
        
        await db.delete(`user_${targetUserId}_bank_frozen`);
        await db.delete(`user_${targetUserId}_freeze_reason`);
        
        const embed = new EmbedBuilder()
            .setTitle('🔥 Account Unfrozen')
            .setDescription(`Bank account for user ${targetUserId} has been unfrozen and is now active.`)
            .setColor(0x00ff00);
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    bank_redeem_modal: async (interaction, db) => {
        const amount = parseInt(interaction.fields.getTextInputValue('redeem_amount'));
        const codeName = interaction.fields.getTextInputValue('redeem_code_name') || generateCode('MONEY');
        const duration = parseInt(interaction.fields.getTextInputValue('redeem_duration'));
        
        const activeCodes = await db.get('active_codes') || {};
        const expiry = duration === 0 ? Date.now() + (365 * 24 * 60 * 60 * 1000) : Date.now() + (duration * 60 * 60 * 1000);
        
        activeCodes[codeName] = {
            type: 'money',
            value: amount,
            reward: `${amount.toLocaleString()} IDR`,
            expiry,
            creator: interaction.user.username
        };
        
        await db.set('active_codes', activeCodes);
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Money Code Created!')
            .addFields(
                { name: '🎫 Code', value: codeName, inline: true },
                { name: '💰 Amount', value: `${amount.toLocaleString()} IDR`, inline: true },
                { name: '⏰ Expires', value: duration === 0 ? 'Never' : `${duration} hours`, inline: true }
            )
            .setColor(0x00ff00);
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    // Developer Management Modals
    add_developer_modal: async (interaction, db) => {
        const username = interaction.fields.getTextInputValue('dev_username');
        const developers = await db.get('developers_list') || ['febiiiiiiiiiiii', 'tc_comunity', 'leio9734'];
        
        if (developers.includes(username)) {
            await interaction.reply({ content: '❌ User is already a developer!', ephemeral: true });
            return;
        }
        
        developers.push(username);
        await db.set('developers_list', developers);
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Developer Added!')
            .setDescription(`👨‍💻 **${username}** has been added as a developer`)
            .setColor(0x00ff00);
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    remove_developer_modal: async (interaction, db) => {
        const username = interaction.fields.getTextInputValue('dev_username_remove');
        const developers = await db.get('developers_list') || ['febiiiiiiiiiiii', 'tc_comunity', 'leio9734'];
        
        if (!developers.includes(username)) {
            await interaction.reply({ content: '❌ User is not a developer!', ephemeral: true });
            return;
        }
        
        const updatedDevelopers = developers.filter(dev => dev !== username);
        await db.set('developers_list', updatedDevelopers);
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Developer Removed!')
            .setDescription(`❌ **${username}** has been removed from developers`)
            .setColor(0xff0000);
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    // Enhanced Job Control Modals
    job_set_hours_modal: async (interaction, db) => {
        const jobType = interaction.fields.getTextInputValue('job_type_hours');
        const startHour = parseInt(interaction.fields.getTextInputValue('work_start_hour'));
        const endHour = parseInt(interaction.fields.getTextInputValue('work_end_hour'));
        
        if (!jobTypes[jobType]) {
            await interaction.reply({ content: '❌ Invalid job type!', ephemeral: true });
            return;
        }
        
        if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
            await interaction.reply({ content: '❌ Hours must be between 0-23!', ephemeral: true });
            return;
        }
        
        await db.set(`job_${jobType}_hours`, { start: startHour, end: endHour });
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Working Hours Set!')
            .setDescription(`⏰ **${jobType.toUpperCase()}** working hours: ${startHour}:00 - ${endHour}:00`)
            .setColor(0x00ff00);
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    job_fire_employee_modal: async (interaction, db) => {
        const userId = interaction.fields.getTextInputValue('fire_user_id');
        const reason = interaction.fields.getTextInputValue('fire_reason');
        
        const job = await db.get(`user_${userId}_job`);
        if (!job) {
            await interaction.reply({ content: '❌ User is not employed!', ephemeral: true });
            return;
        }
        
        // Remove job and role
        await db.delete(`user_${userId}_job`);
        
        // Send different DM based on job type
        try {
            const user = await interaction.client.users.fetch(userId);
            let dmMessage = '';
            
            if (job === 'polisi') {
                dmMessage = '👮‍♂️ **PEMBERITAHUAN RESMI KEPOLISIAN**\n\nAnda telah **DIPECAT** dari jabatan Polisi.\n\n📋 **Alasan:** ' + reason + '\n\n🚫 Akses dan wewenang Anda telah dicabut dengan segera.\n\n⚖️ Keputusan ini bersifat final dan tidak dapat diganggu gugat.';
            } else if (job === 'pemerintah') {
                dmMessage = '🏛️ **SURAT KEPUTUSAN PEMERINTAH**\n\nBerdasarkan keputusan resmi, Anda telah **DISODOK** dari jabatan pemerintahan.\n\n📋 **Alasan:** ' + reason + '\n\n⛔ Seluruh hak dan kewenangan pemerintahan Anda telah dicabut.\n\n📜 SK ini berlaku efektif segera.';
            } else {
                dmMessage = `💼 **PEMBERITAHUAN PEMUTUSAN HUBUNGAN KERJA**\n\nAnda telah **DIPECAT** dari jabatan ${job.toUpperCase()}.\n\n📋 **Alasan:** ${reason}\n\n❌ Status pekerjaan Anda telah dihapus dari sistem.`;
            }
            
            const embed = new EmbedBuilder()
                .setTitle('🔥 PEMUTUSAN HUBUNGAN KERJA')
                .setDescription(dmMessage)
                .setColor(0xff0000)
                .setTimestamp()
                .setFooter({ text: 'NEBIX V20 VERSI UNGGULAN - HR System' });
            
            await user.send({ embeds: [embed] });
            
            // Remove from all servers where they might have the role
            for (const guild of interaction.client.guilds.cache.values()) {
                try {
                    const member = await guild.members.fetch(userId);
                    const role = guild.roles.cache.find(r => r.name === jobTypes[job].roleName);
                    if (role && member.roles.cache.has(role.id)) {
                        await member.roles.remove(role);
                    }
                } catch (error) {
                    // User not in this server
                }
            }
            
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Employee Terminated!')
                .setDescription(`🔥 **${user.username}** has been fired from **${job.toUpperCase()}**\n📝 **Reason:** ${reason}\n📨 **DM Sent:** ✅ Custom message delivered\n🌐 **Global Role Removal:** ✅ Completed`)
                .setColor(0xff0000);
            
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: '❌ Failed to fire employee or send DM!', ephemeral: true });
        }
    }
};
