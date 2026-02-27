'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Save, Key, Cpu, Info, Palette, Mic, Type, Loader2, User, Lock, Mail } from 'lucide-react'
import {
  LLM_PROVIDERS as providers,
  VOICE_OPTIONS as VOICES,
  TONES as TONE_IDS,
  TONE_LABELS,
  PLATFORMS as PLATFORM_IDS,
  PLATFORM_LABELS,
} from '@/lib/constants'

const TONES = TONE_IDS.map(id => ({ id, name: TONE_LABELS[id] }))
const PLATFORMS = PLATFORM_IDS.map(id => ({ id, name: PLATFORM_LABELS[id] }))

const inputClass = "w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
const selectClass = "w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"

export default function SettingsPage() {
  const router = useRouter()
  // Profile
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileCreatedAt, setProfileCreatedAt] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // LLM settings
  const [provider, setProvider] = useState('openrouter')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [llmSaved, setLlmSaved] = useState(false)

  // Brand Kit
  const [brandName, setBrandName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#A855F7')
  const [secondaryColor, setSecondaryColor] = useState('#EC4899')
  const [accentColor, setAccentColor] = useState('#3B82F6')
  const [defaultVoice, setDefaultVoice] = useState('jenny')
  const [defaultTone, setDefaultTone] = useState('casual')
  const [defaultPlatform, setDefaultPlatform] = useState('tiktok')
  const [tagline, setTagline] = useState('')
  const [brandLoading, setBrandLoading] = useState(true)
  const [brandSaving, setBrandSaving] = useState(false)

  const selectedProvider = providers.find(p => p.value === provider)

  // Load brand kit on mount
  useEffect(() => {
    fetch('/api/brand-kit')
      .then(res => res.json())
      .then(data => {
        const kit = data.data?.brandKit
        if (kit) {
          setBrandName(kit.brandName || '')
          setPrimaryColor(kit.primaryColor || '#A855F7')
          setSecondaryColor(kit.secondaryColor || '#EC4899')
          setAccentColor(kit.accentColor || '#3B82F6')
          setDefaultVoice(kit.defaultVoice || 'jenny')
          setDefaultTone(kit.defaultTone || 'casual')
          setDefaultPlatform(kit.defaultPlatform || 'tiktok')
          setTagline(kit.tagline || '')
        }
      })
      .catch(() => toast.error('Failed to load brand kit'))
      .finally(() => setBrandLoading(false))
  }, [])

  // Load profile on mount
  useEffect(() => {
    fetch('/api/auth/profile')
      .then(res => res.json())
      .then(data => {
        const profile = data.data
        if (profile) {
          setProfileName(profile.name || '')
          setProfileEmail(profile.email || '')
          setProfileCreatedAt(profile.createdAt || '')
        }
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setProfileLoading(false))
  }, [])

  const handleSaveProfile = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    setProfileSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = { name: profileName }
      if (currentPassword && newPassword) {
        body.currentPassword = currentPassword
        body.newPassword = newPassword
      }

      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to update profile')
        return
      }

      toast.success(data.meta?.message || 'Profile updated!')
      router.refresh()
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleSaveLLM = () => {
    toast.success('Settings noted! Update your .env.local file with these values.')
    setLlmSaved(true)
    setTimeout(() => setLlmSaved(false), 3000)
  }

  const handleSaveBrandKit = async () => {
    setBrandSaving(true)
    try {
      const res = await fetch('/api/brand-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          primaryColor,
          secondaryColor,
          accentColor,
          defaultVoice,
          defaultTone,
          defaultPlatform,
          tagline,
        }),
      })
      if (res.ok) {
        toast.success('Brand kit saved! Defaults will apply to new content.')
        router.refresh()
      } else {
        toast.error('Failed to save brand kit')
      }
    } catch {
      toast.error('Failed to save brand kit')
    } finally {
      setBrandSaving(false)
    }
  }

  const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-gray-700 bg-transparent cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-100 font-mono"
          placeholder="#A855F7"
        />
        <div className="w-8 h-8 rounded-full border border-gray-600" style={{ backgroundColor: value }} />
      </div>
    </div>
  )

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Settings</h1>
        <p className="text-gray-400">Configure your AI provider and brand preferences</p>
      </div>

      {/* Profile Section */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 space-y-5 mb-6">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-violet-400" />
          <h2 className="font-semibold text-white">Profile</h2>
        </div>

        {profileLoading ? (
          <div className="flex items-center gap-2 text-gray-400 py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading profile...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Display Name
                  </span>
                </label>
                <input
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  placeholder="Your name..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </span>
                </label>
                <input
                  value={profileEmail}
                  disabled
                  className={`${inputClass} opacity-60 cursor-not-allowed`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {profileCreatedAt && `Member since ${new Date(profileCreatedAt).toLocaleDateString()}`}
                </p>
              </div>
            </div>

            {/* Change Password */}
            <div className="border-t border-gray-800 pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Change Password</span>
                <span className="text-xs text-gray-500">(optional)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-400 mt-1">Passwords don&apos;t match</p>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={profileSaving}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {profileSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </>
        )}
      </div>

      {/* Brand Kit Section */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 space-y-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-violet-400" />
            <h2 className="font-semibold text-white">Brand Kit</h2>
          </div>
          <span className="text-xs text-gray-500">Auto-applied to new content</span>
        </div>

        {brandLoading ? (
          <div className="flex items-center gap-2 text-gray-400 py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading brand settings...</span>
          </div>
        ) : (
          <>
            {/* Brand Identity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5" />
                    Brand Name
                  </span>
                </label>
                <input
                  value={brandName}
                  onChange={e => setBrandName(e.target.value)}
                  placeholder="Your brand name..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Tagline</label>
                <input
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  placeholder="Your brand tagline..."
                  className={inputClass}
                />
              </div>
            </div>

            {/* Colors */}
            <div>
              <p className="text-sm font-medium text-gray-300 mb-3">Brand Colors</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ColorPicker label="Primary" value={primaryColor} onChange={setPrimaryColor} />
                <ColorPicker label="Secondary" value={secondaryColor} onChange={setSecondaryColor} />
                <ColorPicker label="Accent" value={accentColor} onChange={setAccentColor} />
              </div>

              {/* Color Preview */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-gray-500">Preview:</span>
                <div className="flex gap-1">
                  <div className="w-20 h-6 rounded" style={{ backgroundColor: primaryColor }} />
                  <div className="w-20 h-6 rounded" style={{ backgroundColor: secondaryColor }} />
                  <div className="w-20 h-6 rounded" style={{ backgroundColor: accentColor }} />
                </div>
              </div>
            </div>

            {/* Defaults */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5" />
                    Default Voice
                  </span>
                </label>
                <select value={defaultVoice} onChange={e => setDefaultVoice(e.target.value)} className={selectClass}>
                  {VOICES.map(v => (
                    <option key={v.id} value={v.id} className="bg-gray-900">
                      {v.name} — {v.style}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Default Tone</label>
                <select value={defaultTone} onChange={e => setDefaultTone(e.target.value)} className={selectClass}>
                  {TONES.map(t => (
                    <option key={t.id} value={t.id} className="bg-gray-900">{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Default Platform</label>
                <select value={defaultPlatform} onChange={e => setDefaultPlatform(e.target.value)} className={selectClass}>
                  {PLATFORMS.map(p => (
                    <option key={p.id} value={p.id} className="bg-gray-900">{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleSaveBrandKit}
              disabled={brandSaving}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {brandSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {brandSaving ? 'Saving...' : 'Save Brand Kit'}
            </button>
          </>
        )}
      </div>

      {/* LLM Settings */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 space-y-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-4 h-4 text-violet-400" />
          <h2 className="font-semibold text-white">AI Provider Configuration</h2>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">LLM Provider</label>
          <select
            value={provider}
            onChange={e => { setProvider(e.target.value); setModel('') }}
            className={selectClass}
          >
            {providers.map(p => (
              <option key={p.value} value={p.value} className="bg-gray-900">{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Model</label>
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className={selectClass}
          >
            <option value="">Default model for {selectedProvider?.label}</option>
            {selectedProvider?.models.map(m => (
              <option key={m} value={m} className="bg-gray-900">{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            <span className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5" />
              API Key
            </span>
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="Enter your API key..."
            className={inputClass}
          />
          <p className="text-xs text-gray-500 mt-1">Your API key is stored securely in environment variables</p>
        </div>

        <button
          onClick={handleSaveLLM}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            llmSaved
              ? 'bg-green-600 text-white'
              : 'bg-violet-600 hover:bg-violet-700 text-white'
          }`}
        >
          <Save className="w-4 h-4" />
          {llmSaved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* Setup Guide */}
      <div className="bg-blue-950/30 border border-blue-800/30 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-blue-400" />
          <h2 className="font-semibold text-blue-300">Environment Setup Guide</h2>
        </div>
        <div className="space-y-3 text-sm">
          <p className="text-gray-300">Add these variables to your <code className="bg-gray-800 px-1.5 py-0.5 rounded text-violet-300">.env.local</code> file:</p>
          <pre className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-gray-300 text-xs overflow-x-auto">
{`LLM_PROVIDER=${provider}
LLM_MODEL=${model || selectedProvider?.models[0] || ''}
LLM_API_KEY=your_api_key_here
NEXTAUTH_SECRET=your_random_secret_here
NEXTAUTH_URL=http://localhost:3000`}
          </pre>
          <div className="space-y-2">
            <p className="text-gray-400 font-medium">Free API signup links:</p>
            <ul className="space-y-1 text-gray-400">
              <li>• <strong className="text-gray-300">OpenRouter:</strong> openrouter.ai (free models available)</li>
              <li>• <strong className="text-gray-300">Groq:</strong> console.groq.com (free tier)</li>
              <li>• <strong className="text-gray-300">Together.ai:</strong> api.together.ai (free credits)</li>
              <li>• <strong className="text-gray-300">HuggingFace:</strong> huggingface.co/settings/tokens (free)</li>
              <li>• <strong className="text-gray-300">Mistral:</strong> console.mistral.ai (free trial)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
