<template>
  <main class="WalletDetails flex flex-col">
    <WalletHeading class="sticky pin-t z-10" />

    <MenuTab
      ref="menutab"
      v-model="currentTab"
      :class="{ 'rounded-bl-lg' : !isDelegatesTab || !isOwned }"
      class="flex-1 overflow-y-auto"
    >
      <MenuTabItem
        key="BackItem"
        :label="$t('COMMON.BACK')"
        :on-click="historyBack"
      >
        <div
          slot="header"
          class="WalletDetails__back-button flex items-center"
        >
          <SvgIcon
            name="send"
            view-box="0 0 8 8"
          />
          <span
            class="text-bold ml-2 text-base"
          >
            {{ $t('COMMON.BACK') }}
          </span>
        </div>
      </MenuTabItem>
      <MenuTabItem
        v-for="tab in tabs"
        :key="tab.componentName"
        :label="tab.text"
        :tab="tab.componentName"
      >
        <Component
          :is="tab.component"
          slot-scope="{ isActive }"
          :is-active="isActive"
          @on-row-click="onRowClick"
        />
      </MenuTabItem>
    </MenuTab>
    <div
      v-if="isDelegatesTab && isOwned"
      class="bg-theme-feature px-5 flex flex-row rounded-bl-lg"
    >
      <div
        class="WalletDetails__button rounded-l"
        @click="openSelectDelegate"
      >
        <SvgIcon
          name="search"
          view-box="0 0 17 16"
          class="mr-2"
        />
        {{ $t('WALLET_DELEGATES.SEARCH_DELEGATE') }}
      </div>
      <div
        class="mt-4 mb-4 py-4 px-6 text-theme-voting-banner-text bg-theme-voting-banner-background w-full flex"
        :class="{ 'rounded-r': isOwned && !votedDelegate }"
      >
        <div
          v-if="!isAwaitingConfirmation && isLoadingVote"
          class="flex"
        >
          <span class="font-semibold">
            {{ $t('WALLET_DELEGATES.LOADING_VOTE') }}
          </span>
        </div>
        <div
          v-else-if="isAwaitingConfirmation"
          class="flex"
        >
          <i18n
            tag="span"
            class="font-semibold"
            path="WALLET_DELEGATES.AWAITING_VOTE_CONFIRMATION"
          >
            <strong place="type">
              {{ $t(`TRANSACTION.TYPE.${unconfirmedVote.publicKey.charAt(0) === '+' ? 'VOTE' : 'UNVOTE'}`) }}
            </strong>
          </i18n>
        </div>
        <div
          v-else-if="votedDelegate"
          class="flex"
        >
          <i18n
            tag="span"
            :class="{
              'border-r border-theme-line-separator' : votedDelegate.rank
            }"
            class="font-semibold pr-6"
            :path="isOwned ? 'WALLET_DELEGATES.VOTED_FOR' : 'WALLET_DELEGATES.WALLET_VOTED_FOR'"
          >
            <strong place="delegate">
              {{ votedDelegate.username }}
            </strong>
          </i18n>
          <template v-if="votedDelegate.rank">
            <i18n
              tag="span"
              class="font-semibold px-6 border-r border-theme-line-separator"
              path="WALLET_DELEGATES.RANK_BANNER"
            >
              <strong place="rank">
                {{ votedDelegate.rank }}
              </strong>
            </i18n>
          </template>
        </div>
        <div
          v-else-if="isOwned && !votedDelegate"
          class="flex"
        >
          <span class="font-semibold">
            {{ $t('WALLET_DELEGATES.NO_VOTE') }}
          </span>
        </div>
      </div>
      <div
        v-if="votedDelegate && !isAwaitingConfirmation && !isLoadingVote"
        class="WalletDetails__button rounded-r"
        @click="openUnvote"
      >
        {{ $t('WALLET_DELEGATES.UNVOTE') }}
      </div>

      <!-- Vote/unvote modal -->
      <TransactionModal
        v-if="isUnvoting || selectedDelegate"
        :title="getVoteTitle()"
        :type="3"
        :delegate="selectedDelegate"
        :is-voter="isUnvoting"
        :voted-delegate="votedDelegate"
        @cancel="onCancel"
        @close="onCancel"
        @sent="onSent"
      />

      <!-- Select delegate modal -->
      <Portal
        v-if="isSelecting"
        to="modal"
      >
        <WalletSelectDelegate
          @cancel="onCancelSelect"
          @close="onCancelSelect"
          @confirm="onConfirmSelect"
        />
      </Portal>
    </div>
  </main>
</template>

<script>
import electron from 'electron'
import { at, clone } from 'lodash'
/* eslint-disable vue/no-unused-components */
import { WalletSelectDelegate } from '@/components/Wallet'
import { ButtonGeneric } from '@/components/Button'
import { TransactionModal } from '@/components/Transaction'
import { WalletExchange, WalletHeading, WalletTransactions, WalletDelegates, WalletStatistics } from '../'
import WalletSignVerify from '../WalletSignVerify'
import { MenuTab, MenuTabItem } from '@/components/Menu'
import SvgIcon from '@/components/SvgIcon'

export default {
  components: {
    ButtonGeneric,
    MenuTab,
    MenuTabItem,
    TransactionModal,
    WalletDelegates,
    WalletExchange,
    WalletHeading,
    WalletSelectDelegate,
    WalletSignVerify,
    WalletStatistics,
    WalletTransactions,
    SvgIcon
  },

  provide () {
    return {
      switchToTab: this.switchToTab,
      walletVote: this.walletVote
    }
  },

  data () {
    return {
      currentTab: '',
      walletVote: {
        publicKey: null
      },
      isVoting: false,
      isUnvoting: false,
      isSelecting: false,
      isLoadingVote: true,
      votedDelegate: null,
      selectedDelegate: null
    }
  },

  computed: {
    pluginTabs () {
      return this.$store.getters['plugin/walletTabs']
    },

    tabs () {
      const tabs = [
        {
          component: 'WalletTransactions',
          componentName: 'WalletTransactions',
          text: this.$t('PAGES.WALLET.TRANSACTIONS')
        },
        {
          component: 'WalletDelegates',
          componentName: 'WalletDelegates',
          text: this.$t('PAGES.WALLET.DELEGATES')
        }
      ]

      if (this.currentWallet && !this.currentWallet.isContact && !this.currentWallet.isLedger) {
        tabs.push({
          component: 'WalletSignVerify',
          componentName: 'WalletSignVerify',
          text: this.$t('PAGES.WALLET.SIGN_VERIFY')
        })
      }

      if (this.currentNetwork && !this.currentWallet.isContact && this.currentNetwork.market && this.currentNetwork.market.enabled) {
        tabs.push({
          component: 'WalletExchange',
          componentName: 'WalletExchange',
          text: this.$t('PAGES.WALLET.PURCHASE', { ticker: this.currentNetwork.market.ticker })
        })
      }

      // TODO enable when there is something to show
      // if (this.session_network.market && this.session_network.market.enabled) {
      //   tabs.push({
      //     component: 'WalletStatistics',
      //     text: this.$t('PAGES.WALLET.STATISTICS')
      //   })
      // }

      if (this.pluginTabs) {
        this.pluginTabs.forEach(pluginTab => {
          tabs.push({
            component: pluginTab.component,
            componentName: pluginTab.componentName,
            text: pluginTab.tabTitle
          })
        })
      }

      return tabs
    },

    currentNetwork () {
      return this.session_network
    },

    currentWallet () {
      return this.wallet_fromRoute
    },

    isDelegatesTab () {
      return this.currentTab === 'WalletDelegates'
    },

    isOwned () {
      return [
        ...this.$store.getters['wallet/byProfileId'](this.session_profile.id),
        ...this.$store.getters['ledger/wallets']
      ].some(wallet => wallet.address === this.currentWallet.address)
    },

    unconfirmedVote () {
      return this.unconfirmedVotes.find(vote => {
        return vote.address === this.currentWallet.address
      })
    },

    unconfirmedVotes: {
      get () {
        return this.$store.getters['session/unconfirmedVotes']
      },
      set (votes) {
        this.$store.dispatch('session/setUnconfirmedVotes', votes)
        const profile = clone(this.session_profile)
        profile.unconfirmedVotes = votes
        this.$store.dispatch('profile/update', profile)
      }
    },

    isAwaitingConfirmation () {
      return !!this.unconfirmedVote
    }
  },

  watch: {
    currentTab () {
      switch (this.currentTab) {
        case 'WalletTransactions':
          this.$synchronizer.focus('wallets', 'contacts')
          break
        case 'WalletDelegates':
          this.$synchronizer.focus('wallets', 'contacts', 'delegates')
          break
        case 'WalletSignVerify':
          // TODO
          break
      }
    },
    tabs () {
      this.$nextTick(() => {
        this.$refs.menutab.collectItems()
      })
    },
    async isAwaitingConfirmation (newValue, oldValue) {
      if (!newValue && oldValue) {
        await this.fetchWalletVote()
      }
    }
  },

  async created () {
    await this.$synchronizer.call('wallets')
    await this.fetchWalletVote()
    this.$eventBus.on('wallet:reload', this.fetchWalletVote)
  },

  beforeDestroy () {
    this.$eventBus.off('wallet:reload', this.fetchWalletVote)
  },

  mounted () {
    this.currentTab = this.tabs[0].component
  },

  methods: {
    historyBack () {
      const webContents = electron.remote.getCurrentWindow().webContents
      if (!webContents.canGoBack()) {
        throw new Error('It is not possible to go back in history')
      }

      webContents.goBack()
    },

    switchToTab (component) {
      this.currentTab = component
    },

    getVoteTitle () {
      if (this.isUnvoting && this.votedDelegate) {
        return this.$t('WALLET_DELEGATES.UNVOTE_DELEGATE', { delegate: this.votedDelegate.username })
      } else if (this.isVoting && this.selectedDelegate) {
        return this.$t('WALLET_DELEGATES.VOTE_DELEGATE', { delegate: this.selectedDelegate.username })
      } else {
        return `${this.$t('COMMON.DELEGATE')} ${this.selectedDelegate.username}`
      }
    },

    async fetchWalletVote () {
      if (!this.currentWallet) {
        return
      }

      try {
        this.isLoadingVote = true
        const walletVote = await this.$client.fetchWalletVote(this.currentWallet.address)

        if (walletVote) {
          this.votedDelegate = this.$store.getters['delegate/byPublicKey'](walletVote)
          this.walletVote.publicKey = walletVote
        } else {
          this.votedDelegate = null
          this.walletVote.publicKey = null
        }
      } catch (error) {
        this.votedDelegate = null
        this.walletVote.publicKey = null

        const messages = at(error, 'response.body.message')
        if (messages[0] !== 'Wallet not found') {
          this.$logger.error(error)
          this.$error(this.$t('COMMON.FAILED_FETCH', {
            name: 'fetch vote',
            msg: error.message
          }))
        }
      } finally {
        this.isLoadingVote = false
      }
    },

    openUnvote () {
      this.selectedDelegate = this.votedDelegate
      this.isUnvoting = true
    },

    openSelectDelegate () {
      this.isSelecting = true
    },

    onCancel () {
      this.isUnvoting = false
      this.isVoting = false
      this.selectedDelegate = null
    },

    onCancelSelect () {
      this.isSelecting = false
    },

    onConfirmSelect (value) {
      this.selectedDelegate = this.$store.getters['delegate/search'](value)

      if (this.selectedDelegate) {
        this.isSelecting = false

        if (this.votedDelegate) {
          if (this.selectedDelegate.publicKey === this.votedDelegate.publicKey) {
            this.isUnvoting = true
          }
        } else {
          this.isVoting = true
        }
      }
    },

    onSent (success, transaction) {
      if (success) {
        const votes = [
          ...this.unconfirmedVotes,
          {
            id: transaction.id,
            address: this.currentWallet.address,
            publicKey: transaction.asset.votes[0]
          }
        ]

        this.unconfirmedVotes = votes
      }

      this.selectedDelegate = null
      this.isUnvoting = false
      this.isVoting = false
    },

    onRowClick (publicKey) {
      this.onConfirmSelect(publicKey)
    }
  }
}
</script>

<style lang="postcss">
.WalletDetails .MenuTab > .MenuTab__nav {
  @apply .sticky .pin-t .z-10
}
.WalletDetails__button {
  transition: 0.5s;
  cursor: pointer;
  @apply .flex .items-center .text-theme-voting-banner-button-text .bg-theme-voting-banner-button .whitespace-no-wrap .mt-4 .mb-4 .p-4 .font-semibold .w-auto .text-center
}
.WalletDetails__button:hover {
  transition: 0.5s;
  @apply .text-theme-voting-banner-button-text-hover .bg-theme-voting-banner-button-hover
}
.WalletDetails__back-button > svg {
  transform: rotate(-135deg)
}
</style>
