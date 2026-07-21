import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import {errorHandler} from './middleware/error.middleware';
import authRouter from './routes/auth.route';


const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
})

app.use('/api/auth', authRouter);

app.use(errorHandler);


export default app;