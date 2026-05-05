'use client';
import { useState } from 'react';

const FAQS = [
  {
    question: "What is Uptime and Sitemonitor?",
    answer: "Uptime (featuring Sitemonitor technology) is a high-performance monitoring platform and professional monitor tool designed to keep track of your websites and APIs. It checks your services at regular intervals and alerts you immediately if something goes wrong."
  },
  {
    question: "How to start monitoring with Sitemonitor?",
    answer: "Getting started with our monitor tool is simple. Once you sign up, you'll be taken to your dashboard where you can see all your monitors. If you're new, you'll start with a clean slate ready for your first Sitemonitor target."
  },
  {
    question: "How to set up a Homepage Sitemonitor?",
    answer: "To create a Homepage Sitemonitor, click the 'New' button in your dashboard. Enter your homepage URL, give it a name, and set the check interval. We'll handle the rest, checking your service from multiple regions around the world."
  },
  {
    question: "Does Uptime offer Sitemonitor Enterprise solutions?",
    answer: "Yes, our Sitemonitor Enterprise plan is engineered for large-scale operations requiring high-frequency checks and advanced multi-location testing. It's the definitive monitor tool for mission-critical services."
  },
  {
    question: "How to add alert contacts to my monitor tool?",
    answer: "You can configure alert contacts within each Sitemonitor's settings. Currently, we support email notifications, and we're rapidly adding support for Slack, Discord, and Webhooks."
  },
  {
    question: "How to analyze performance with Sitemonitor?",
    answer: "Each monitor tool has a detailed view where you can see response time graphs, uptime percentages, and incident history. This helps you identify trends and optimize your Sitemonitor performance."
  }
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-32 px-6 relative border-t border-emerald-900/20">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 italic tracking-tight">
            Common Questions<span className="text-emerald-500">.</span>
          </h2>
          <p className="text-slate-400 font-medium">
            Everything you need to know about our monitoring platform.
          </p>
        </div>

        <div className="divide-y divide-emerald-900/20">
          {FAQS.map((faq, i) => (
            <div key={i} className="py-2">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full py-6 flex items-center justify-between text-left group"
              >
                <span className="text-xl font-bold text-white italic tracking-tight group-hover:text-emerald-400 transition-colors">
                  {faq.question}
                </span>
                <span className={`text-slate-500 group-hover:text-emerald-400 transition-all duration-300 ${openIndex === i ? 'rotate-45' : ''}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </button>

              <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${openIndex === i ? 'max-h-96 pb-8 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <p className="text-lg text-slate-400 leading-relaxed font-medium max-w-3xl">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
