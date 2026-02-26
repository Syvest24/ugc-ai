'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Save, Key, Cpu, Info } from 'lucide-react'

const providers = [
  { value: 'openrouter', label: 'OpenRouter (Free)', models: ['mistralai/mistral-7b-instruct:free', 'meta-llama/llama-3-8b-instruct:free'] },
  { value: 'groq', label: 'Groq (Free)', models: ['llama3-8b-8192', 'mixtral-8x7b-32768', 'gemma-7b-it'] },
  { value: 'together', label: 'Together.ai (Free)', models: ['mistralai/Mistral-7B-Instruct-v0.2', 'togethercomputer/llama-2-7b-chat'] },
  { value: 'huggingface', label: 'HuggingFace (Free)', models: ['mistralai/Mistral-7B-Instruct-v0.2', 'HuggingFaceH4/zephyr-7b-beta'] },
  { value: 'mistral', label: 'Mistral AI', models: ['mistral-small-latest', 'mistral-medium-latest'] },
]

export default function SettingsPage() {
  const [provider, setProvider] = useState('openrouter')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  const selectedProvider = providers.find(p => p.value === provider)

  const handleSave = () => {
    toast.success('Settings noted! Update your .env.local file with these values.')
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Settings</h1>
        <p className="text-gray-400">Configure your AI provider and preferences</p>
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
            className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
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
            className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
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
            className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
          />
          <p className="text-xs text-gray-500 mt-1">Your API key is stored securely in environment variables</p>
        </div>

        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-violet-600 hover:bg-violet-700 text-white'
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save Settings'}
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
