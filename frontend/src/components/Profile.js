import React from 'react';
import PropTypes from 'prop-types'; // Импортируем PropTypes

function Profile({ user }) {
  if (!user) {
    return <div>Please log in to view your profile.</div>;
  }

  return (
    <div className="profile">
      <h2>User Profile</h2>
      <img src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`} alt="User Avatar" />
      <p><strong>Username:</strong> {user.username}#{user.discriminator}</p>
      <p><strong>Discord ID:</strong> {user.discordId}</p>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Locale:</strong> {user.locale}</p>
      {user.premiumType !== undefined && (
        <p><strong>Premium Type:</strong> {getPremiumTypeName(user.premiumType)}</p>
      )}
      {user.flags !== undefined && (
        <p><strong>Flags:</strong> {getFlags(user.flags)}</p>
      )}
      {user.banner && (
        <p><strong>Banner:</strong> <img src={`https://cdn.discordapp.com/banners/${user.discordId}/${user.banner}.png`} alt="User Banner" /></p>
      )}
      {user.accentColor && (
        <p><strong>Accent Color:</strong> <span style={{backgroundColor: `#${user.accentColor.toString(16)}`, padding: '5px', color: 'white'}}>{`#${user.accentColor.toString(16)}`}</span></p>
      )}
      {user.guilds && user.guilds.length > 0 && (
        <div>
          <strong>Guilds:</strong>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {user.guilds.map(guild => (
              <li key={guild.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                {guild.icon ? (
                  <img 
                    src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} 
                    alt={`${guild.name} icon`}
                    style={{ width: '32px', height: '32px', marginRight: '10px', borderRadius: '50%' }}
                  />
                ) : (
                  <div style={{ width: '32px', height: '32px', marginRight: '10px', backgroundColor: '#7289DA', borderRadius: '50%' }}></div>
                )}
                {guild.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function getPremiumTypeName(premiumType) {
  switch (premiumType) {
    case 0: return 'None';
    case 1: return 'Nitro Classic';
    case 2: return 'Nitro';
    case 3: return 'Nitro Basic';
    default: return 'Unknown';
  }
}

function getFlags(flags) {
  const flagNames = [];
  if (flags & (1 << 0)) flagNames.push('Discord Employee');
  if (flags & (1 << 1)) flagNames.push('Partnered Server Owner');
  if (flags & (1 << 2)) flagNames.push('HypeSquad Events');
  if (flags & (1 << 3)) flagNames.push('Bug Hunter Level 1');
  // Add more flag checks as needed
  return flagNames.join(', ') || 'None';
}

// Добавляем валидацию пропсов
Profile.propTypes = {
  user: PropTypes.shape({
    discordId: PropTypes.string.isRequired,
    avatar: PropTypes.string,
    username: PropTypes.string.isRequired,
    discriminator: PropTypes.string,
    email: PropTypes.string,
    locale: PropTypes.string,
    premiumType: PropTypes.number,
    flags: PropTypes.number,
    banner: PropTypes.string,
    accentColor: PropTypes.string,
    guilds: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
};

export default Profile;
