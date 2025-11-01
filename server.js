import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/speak', (req, res) => {
  const { digit, voice } = req.body;
  
  if (digit === undefined) {
    return res.status(400).json({ error: 'Digit is required' });
  }

  // Build arguments for the say command
  const args = [];
  if (voice) {
    args.push('-v', voice);
  }
  args.push(digit.toString());

  // Use macOS 'say' command to speak the digit
  const say = spawn('/usr/bin/say', args);

  say.on('error', (error) => {
    console.error('Error executing say command:', error);
    res.status(500).json({ error: 'Failed to speak digit' });
  });

  say.on('close', (code) => {
    if (code === 0) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Say command failed' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
