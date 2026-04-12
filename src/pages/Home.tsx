import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Cpu, Zap, Shield, Globe } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="py-20 text-center max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-bold tracking-widest uppercase mb-6 inline-block">
            The Future of Compute
          </span>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">
            Decentralized GPU <br /> Power on Demand.
          </h1>
          <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
            GPU-CHAIN is a P2P marketplace connecting researchers and developers with high-performance GPU owners worldwide. Low latency, high throughput, zero friction.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/auth"
              className="px-8 py-4 bg-white text-black rounded-full text-lg font-bold hover:scale-105 transition-transform w-full sm:w-auto"
            >
              Start Computing
            </Link>
            <Link
              to="/marketplace"
              className="px-8 py-4 bg-white/5 border border-white/10 rounded-full text-lg font-bold hover:bg-white/10 transition-colors w-full sm:w-auto"
            >
              Explore Marketplace
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
        {[
          {
            icon: <Zap className="w-6 h-6 text-yellow-400" />,
            title: "Instant Execution",
            desc: "Tasks are routed to the nearest available GPU via our P2P network."
          },
          {
            icon: <Shield className="w-6 h-6 text-green-400" />,
            title: "Secure Sandbox",
            desc: "Code executes in isolated environments on worker machines."
          },
          {
            icon: <Globe className="w-6 h-6 text-blue-400" />,
            title: "Global Network",
            desc: "Access a distributed pool of GPUs from anywhere in the world."
          },
          {
            icon: <Cpu className="w-6 h-6 text-purple-400" />,
            title: "Cost Efficient",
            desc: "Pay only for what you use with our transparent credit system."
          }
        ].map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors group"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
            <p className="text-white/50 leading-relaxed">{feature.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* Stats Section */}
      <section className="py-20 w-full border-y border-white/10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: "Active GPUs", value: "1,240+" },
            { label: "Tasks Completed", value: "85.4k" },
            { label: "Avg. Latency", value: "12ms" },
            { label: "Uptime", value: "99.9%" }
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-4xl font-bold tracking-tighter mb-2">{stat.value}</div>
              <div className="text-white/40 text-sm font-medium uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
