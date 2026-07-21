import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import {errorHandler} from './middleware/error.middleware';
import authRouter from './routes/auth.route';
import apartmentRouter from './routes/apartment.route';
import roomRouter from './routes/room.route';

const app = express();
const endpoint = '/api';


app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
})

app.use(`${endpoint}/auth`, authRouter);
app.use(endpoint, apartmentRouter);
app.use(endpoint, roomRouter);




app.use(errorHandler);

export default app;