import './app';
import 'dotenv';
import app from './app';
import {prisma} from './utils/prisma';
import authRouter from './routes/auth.route';


const PORT = process.env.PORT || 3000;
app.use('/api',authRouter);

async function startServer(){
    await prisma.$connect()
    console.log("DB connected! ✅");

    app.listen(PORT, ()=>{
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🔒 Auth endpoints active at http://localhost:${PORT}/api/register`);
    })
}

startServer();