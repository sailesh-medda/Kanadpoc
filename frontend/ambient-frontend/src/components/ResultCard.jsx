import { motion } from "framer-motion"

export default function ResultCard({ title, content }) {

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2>{title}</h2>
      <p>{content}</p>
    </motion.div>
  )
}