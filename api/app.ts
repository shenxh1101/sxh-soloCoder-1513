import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { initDatabase } from './db.js'

import facilityRoutes from './routes/facilities.js'
import repairOrderRoutes from './routes/repairOrders.js'
import workerRoutes from './routes/workers.js'
import statisticsRoutes from './routes/statistics.js'
import uploadRoutes from './routes/upload.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

initDatabase()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.use('/api/facilities', facilityRoutes)
app.use('/api/repair-orders', repairOrderRoutes)
app.use('/api/workers', workerRoutes)
app.use('/api/statistics', statisticsRoutes)
app.use('/api/upload', uploadRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(error)
  res.status(500).json({
    success: false,
    error: error.message || 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
