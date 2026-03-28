/**
 * Marketing landing page
 */
'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/src/components/ui/Button'
import { Badge } from '@/src/components/ui/Badge'
import { Zap, MessageSquare, Webhook, Users, Heart, TrendingUp } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-violet-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                <Zap size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Shoutboard</span>
            </Link>

            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="section-container">
        <div className="text-center">
          <Badge className="mb-4 justify-center">
            <span className="mr-2">✨</span> Recognition that lives where your team works
          </Badge>

          <h1 className="mt-6 text-5xl font-bold leading-tight text-gray-900 sm:text-6xl">
            Group Recognition Cards for Modern Teams
          </h1>

          <p className="mt-6 text-xl text-gray-600">
            Create beautiful, shareable recognition cards. Celebrate milestones with your entire team. API-first for
            seamless integration.
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <Link href="/signup">
              <Button variant="primary" size="lg">
                Start Free
              </Button>
            </Link>
            <Link href="/docs">
              <Button variant="outline" size="lg">
                View API Docs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section-container bg-white">
        <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">Why Shoutboard?</h2>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: <MessageSquare size={32} className="text-indigo-600" />,
              title: 'Group Cards',
              description:
                'Gather messages from your entire team on beautiful, shareable recognition cards.',
            },
            {
              icon: <Webhook size={32} className="text-violet-600" />,
              title: 'Full REST API',
              description:
                'Integrate Shoutboard into your workflow with our complete, well-documented API.',
            },
            {
              icon: <Zap size={32} className="text-indigo-600" />,
              title: 'Webhook Automations',
              description:
                'Trigger automations when boards are sent or when milestones are reached.',
            },
            {
              icon: <Users size={32} className="text-violet-600" />,
              title: 'Team Collaboration',
              description:
                'Invite team members to contribute and build a culture of recognition.',
            },
            {
              icon: <Heart size={32} className="text-indigo-600" />,
              title: 'Beautiful Design',
              description:
                'Stunning, customizable card designs that represent your company brand.',
            },
            {
              icon: <TrendingUp size={32} className="text-violet-600" />,
              title: 'Analytics',
              description:
                'Track recognition trends and measure the impact on team engagement.',
            },
          ].map((feature, i) => (
            <div key={i} className="card p-6">
              <div className="mb-4">{feature.icon}</div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="section-container">
        <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">Simple, Transparent Pricing</h2>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              name: 'Starter',
              price: '$29',
              description: 'Perfect for small teams',
              features: ['Up to 10 boards/month', 'Basic analytics', 'Email support'],
              cta: 'Get Started',
              highlighted: false,
            },
            {
              name: 'Growth',
              price: '$79',
              description: 'For growing teams',
              features: [
                'Unlimited boards',
                'Advanced analytics',
                'API access',
                'Priority support',
              ],
              cta: 'Get Started',
              highlighted: true,
            },
            {
              name: 'Scale',
              price: '$199',
              description: 'For enterprises',
              features: [
                'Everything in Growth',
                'Custom branding',
                'Webhooks',
                'SSO',
                'Dedicated support',
              ],
              cta: 'Contact Sales',
              highlighted: false,
            },
          ].map((plan, i) => (
            <div
              key={i}
              className={`card p-8 ${
                plan.highlighted
                  ? 'ring-2 ring-indigo-600 lg:scale-105'
                  : ''
              }`}
            >
              {plan.highlighted && (
                <Badge variant="primary" className="mb-4">
                  Most Popular
                </Badge>
              )}
              <h3 className="mb-2 text-2xl font-bold text-gray-900">
                {plan.name}
              </h3>
              <p className="mb-4 text-gray-600">{plan.description}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">
                  {plan.price}
                </span>
                <span className="ml-2 text-gray-600">/month</span>
              </div>

              <ul className="mb-8 space-y-3">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-2 text-gray-700">
                    <span className="text-indigo-600">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.highlighted ? 'primary' : 'outline'}
                className="w-full"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="section-container">
        <div className="gradient-primary rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold">Ready to celebrate your team?</h2>
          <p className="mt-4 text-lg opacity-90">
            Join thousands of teams recognizing greatness every day.
          </p>
          <Link href="/signup" className="mt-8 inline-block">
            <Button variant="secondary" size="lg">
              Start Free Today
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="section-container">
          <div className="mb-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="font-semibold text-gray-900">Product</h3>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/features" className="hover:text-gray-900">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-gray-900">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Developers</h3>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/docs" className="hover:text-gray-900">
                    API Docs
                  </Link>
                </li>
                <li>
                  <a href="https://github.com" className="hover:text-gray-900">
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Company</h3>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-gray-900">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Legal</h3>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 py-8 text-center text-sm text-gray-600">
            <p>© 2024 Shoutboard. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
