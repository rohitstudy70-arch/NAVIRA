import mongoose from 'mongoose';

export async function connectDatabase() {
  let uri = (process.env.MONGODB_URI || '').trim();
  // Strip accidental surrounding quotes if pasted in Render with quotes
  if ((uri.startsWith("'") && uri.endsWith("'")) || (uri.startsWith('"') && uri.endsWith('"'))) {
    uri = uri.slice(1, -1).trim();
  }

  if (!uri) throw new Error('MONGODB_URI is not configured');

  const masked = uri.replace(/\/\/[^:]+:[^@]+@/, (match) => {
    const user = match.split(':')[0].replace('//', '');
    return `//${user}:***@`;
  });
  console.log(`[DB] Attempting connection to: ${masked}`);

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`[DB] MongoDB connected successfully to: ${mongoose.connection.host}`);
}
