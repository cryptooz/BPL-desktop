import { isBoolean } from 'lodash'
import BaseModel from './base'

export default new BaseModel({
  type: 'object',
  properties: {
    id: {
      type: 'string',
      minLength: 1,
      maxLength: 16
    },
    avatar: {
      anyOf: [
        // Images provided by the app
        {
          type: 'string',
          minLength: 1
        },
        // Images provided by the plugins
        {
          type: 'object',
          properties: {
            avatarName: {
              type: 'string'
            },
            pluginId: {
              type: 'string'
            }
          }
        },
        // No avatar (use name first character)
        {
          type: 'null'
        }
      ]
    },
    background: {
      type: 'string',
      minLength: 1
    },
    currency: {
      type: 'string',
      minLength: 3,
      maxLength: 3
    },
    timeFormat: {
      type: 'string',
      default: 'Default'
    },
    hideWalletButtonText: {
      type: 'boolean',
      format: data => data.hideWalletButtonText !== undefined ? data.hideWalletButtonText : false
    },
    marketChartOptions: {
      type: 'object',
      format: data => data.marketChartOptions || { isEnabled: true, isExpanded: true, period: 'day' }
    },
    language: {
      type: 'string',
      minLength: 1
    },
    bip39Language: {
      type: ['string', 'null'],
      format: data => data.bip39Language || null
    },
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 120
    },
    networkId: {},
    theme: {
      type: 'string',
      minLength: 1
    },
    screenshotProtection: {
      type: 'boolean',
      format: data => data.screenshotProtection !== undefined ? data.screenshotProtection : true
    },
    backgroundUpdateLedger: {
      type: 'boolean',
      format: data => data.backgroundUpdateLedger !== undefined ? data.backgroundUpdateLedger : true
    },
    broadcastPeers: {
      type: 'boolean',
      format: data => data.broadcastPeers !== undefined ? data.broadcastPeers : true
    },
    ledgerCache: {
      type: 'boolean',
      format: data => data.ledgerCache || false
    },
    showPluginConfirmation: {
      type: 'boolean',
      format: data => isBoolean(data.showPluginConfirmation) ? data.showPluginConfirmation : true
    },
    transactionTableRowCount: {
      type: 'integer',
      format: data => data.transactionTableRowCount || 10
    },
    unconfirmedVotes: {
      type: 'array',
      format: data => data.unconfirmedVotes || []
    },
    walletLayout: {
      type: 'string',
      format: data => data.walletLayout || 'grid'
    },
    walletSidebarSortParams: {
      type: 'object',
      format: data => data.walletSidebarSortParams || { field: 'name', type: 'asc' }
    },
    walletSidebarFilters: {
      type: 'object',
      format: data => data.walletSidebarFilters || {}
    },
    walletSortParams: {
      type: 'object',
      format: data => data.walletSortParams || { field: 'balance', type: 'desc' }
    },
    contactSortParams: {
      type: 'object',
      format: data => data.contactSortParams || { field: 'name', type: 'asc' }
    },
    pluginSortParams: {
      type: 'object',
      format: data => data.pluginSortParams || { field: 'id', type: 'asc' }
    }
  },
  required: ['background', 'currency', 'language', 'name', 'networkId', 'theme']
})
