'use client'

import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { useSync } from '@tldraw/sync'
import { AssetRecordType, getHashForString, TLAssetStore, TLBookmarkAsset, uniqueId } from 'tldraw'

const WORKER_URL = `http://192.168.0.105:5858`
const roomId = 'test-room'

const multiplayerAssets: TLAssetStore = {
	async upload(_asset, file) {
		const id = uniqueId()
		const objectName = `${id}-${file.name}`
		const url = `${WORKER_URL}/uploads/${encodeURIComponent(objectName)}`

		const response = await fetch(url, {
			method: 'PUT',
			body: file,
		})

		if (!response.ok) {
			throw new Error(`Failed to upload asset: ${response.statusText}`)
		}

		return { src: url }
	},
	resolve(asset) {
		return asset.props.src
	},
}

async function unfurlBookmarkUrl({ url }: { url: string }): Promise<TLBookmarkAsset> {
	const asset: TLBookmarkAsset = {
		id: AssetRecordType.createId(getHashForString(url)),
		typeName: 'asset',
		type: 'bookmark',
		meta: {},
		props: {
			src: url,
			description: '',
			image: '',
			favicon: '',
			title: '',
		},
	}

	try {
		const response = await fetch(`${WORKER_URL}/unfurl?url=${encodeURIComponent(url)}`)
		const data = await response.json()

		asset.props.description = data?.description ?? ''
		asset.props.image = data?.image ?? ''
		asset.props.favicon = data?.favicon ?? ''
		asset.props.title = data?.title ?? ''
	} catch (e) {
		console.error(e)
	}

	return asset
}

export default function App() {
	const store = useSync({
		uri: `${WORKER_URL}/connect/${roomId}`,
		assets: multiplayerAssets,
	})

	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw 
				store={store}
				onMount={(editor) => {
					// @ts-expect-error
					window.editor = editor
					editor.registerExternalAssetHandler('url', unfurlBookmarkUrl)
				}}
			/>
		</div>
	)
}