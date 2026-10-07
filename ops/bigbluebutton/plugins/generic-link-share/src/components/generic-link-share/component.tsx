import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import * as ReactDOM from 'react-dom/client';
import {
  ActionButtonDropdownOption,
  ActionButtonDropdownSeparator,
  BbbPluginSdk,
  GenericContentMainArea,
  PluginApi,
  LayoutPresentationAreaUiDataNames,
  UiLayouts,
  CurrentPresentation,
  RESET_DATA_CHANNEL,
  pluginLogger,
  PresentationToolbarButton,
} from 'bigbluebutton-html-plugin-sdk';
import { parseTags } from '../utils';

import GenericComponentLinkShare from '../generic-component/component';

import {
  CurrentUserData,
  DataToGenericLink,
  GenericLinkShareProps,
  UserMetadata,
  UserMetadataGraphqlResponse,
} from './types';
import { ModalToShareLink } from '../modal-to-share-link/component';
import { LinkTag } from '../modal-to-share-link/types';
import { REGEX } from './constants';
import { mergePlaceholdersList, replaceUrlPlaceholders } from './utils';
import { USER_METADATA } from './subscription';
import SynapseQuizRuntime from '../synapse-quiz/component';

function GenericLinkShare(
  { pluginUuid: uuid }: GenericLinkShareProps,
): React.ReactElement {
  BbbPluginSdk.initialize(uuid);
  const pluginApi: PluginApi = BbbPluginSdk.getPluginApi(uuid);
  const userMetaDataSubscription = pluginApi
    .useCustomSubscription<UserMetadataGraphqlResponse>(USER_METADATA);
  const { data: currentUser } = pluginApi.useCurrentUser();
  const { data: urlToGenericLink, pushEntry: pushEntryUrlToGenericLink, deleteEntry: deleteEntryUrlToGenericLink } = pluginApi.useDataChannel<DataToGenericLink>('urlToGenericLink');
  const { data: userData } = userMetaDataSubscription;
  const currentPresentationResponse = pluginApi.useCurrentPresentation();
  const currentLayout = pluginApi.useUiData(LayoutPresentationAreaUiDataNames.CURRENT_ELEMENT, [{
    isOpen: true,
    currentElement: UiLayouts.WHITEBOARD,
  }]);
  const [genericContentId, setGenericContentId] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showingPresentationContent, setShowingPresentationContent] = useState(false);
  const [link, setLink] = useState<string>(null);
  const [linkError, setLinkError] = useState<string>(null);
  const [restUserMetadata, setRestUserMetadata] = useState<UserMetadata[]>([]);
  const [previousModalState, setPreviousModalState] = useState<DataToGenericLink>({
    isUrlSameForRole: true,
    url: null,
  });
  const initialLinkPublished = useRef(false);
  const previousPresentationId = useRef<string | null>(null);
  const subscribedUserMetadata = userData?.user_metadata;
  const userMetadata = restUserMetadata.length > 0
    ? restUserMetadata
    : subscribedUserMetadata;

  // The plugin SDK custom subscription can miss user metadata for viewers
  // during the initial GraphQL reconnect. BBB stores the current tab's token
  // in sessionStorage and its own client reads metadata through this REST
  // endpoint, so use the same path as a reliable per-user source.
  useEffect(() => {
    const controller = new AbortController();
    let retryTimer: number | undefined;
    const loadCurrentUserMetadata = () => {
      const sessionToken = window.sessionStorage.getItem('sessionToken');
      if (!sessionToken) return;

      fetch('/api/rest/userMetadata', {
        credentials: 'include',
        headers: { 'x-session-token': sessionToken },
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then((payload: UserMetadataGraphqlResponse) => {
          const metadata = payload.user_metadata || [];
          if (metadata.length > 0) {
            setRestUserMetadata(metadata);
            if (retryTimer) window.clearInterval(retryTimer);
          }
        })
        .catch((requestError) => {
          if (requestError?.name !== 'AbortError') {
            pluginLogger.error(`Could not load current user metadata: ${requestError.message}`);
          }
        });
    };

    loadCurrentUserMetadata();
    retryTimer = window.setInterval(loadCurrentUserMetadata, 2000);

    return () => {
      if (retryTimer) window.clearInterval(retryTimer);
      controller.abort();
    };
  }, []);

  const initialPdfUrl = userMetadata?.find(
    (entry) => entry.parameter === 'genericLinkShare_initialUrl',
  )?.value;

  const currentUserPlaceholders: CurrentUserData = {
    name: currentUser?.name ?? '',
    extId: currentUser?.extId ?? '',
    role: currentUser?.role ?? '',
    presenter: !!currentUser?.presenter,
  };

  // Synapse passes the first lesson PDF as join metadata. The presenter
  // publishes it once to the plugin data channel so every participant opens
  // the same continuously scrollable document reader automatically.
  useEffect(() => {
    if (!currentUser?.presenter || initialLinkPublished.current) return;
    const alreadyShared = urlToGenericLink?.data?.some((entry) => entry?.payloadJson?.url);
    if (alreadyShared) {
      initialLinkPublished.current = true;
      return;
    }
    if (initialPdfUrl && initialPdfUrl.match(REGEX)) {
      initialLinkPublished.current = true;
      pushEntryUrlToGenericLink({ isUrlSameForRole: true, url: initialPdfUrl });
    }
  }, [currentUser?.presenter, initialPdfUrl, urlToGenericLink]);

  // The PDF reader is a generic-content layer above BBB's native
  // presentation. When the presenter selects another BBB presentation, close
  // that layer for everyone so the newly selected PPT/PDF is actually visible.
  // Page changes keep the layer untouched because they retain presentationId.
  useEffect(() => {
    if (!currentUser?.presenter) return;

    const currentPresentationId = currentPresentationResponse.data?.presentationId;
    if (!currentPresentationId) return;

    if (previousPresentationId.current === null) {
      previousPresentationId.current = currentPresentationId;
      return;
    }

    if (previousPresentationId.current !== currentPresentationId) {
      previousPresentationId.current = currentPresentationId;
      if (link) {
        deleteEntryUrlToGenericLink([RESET_DATA_CHANNEL]);
      }
    }
  }, [
    currentPresentationResponse.data?.presentationId,
    currentUser?.presenter,
    link,
  ]);

  useEffect(() => {
    const isGenericComponentInPile = currentLayout.some((gc) => (
      gc.currentElement === UiLayouts.GENERIC_CONTENT
      && gc.genericContentId === genericContentId
    ));
    if (isGenericComponentInPile) {
      setShowingPresentationContent(true);
    } else setShowingPresentationContent(false);
  }, [currentLayout]);

  const handleCheckboxChange = () => {
    setPreviousModalState((p) => ({
      isUrlSameForRole: !p.isUrlSameForRole,
      url: p.url,
      viewerUrl: p.viewerUrl,
    }));
  };

  const handleCloseModal = (): void => {
    setShowModal(false);
    setLinkError(null);
  };

  const handleChangePresentationAreaContent = (changeToShare: boolean) => {
    if (!changeToShare) {
      setShowingPresentationContent(false);
    } else {
      setShowingPresentationContent(true);
    }
  };

  const requestCurrentPage = (currentTxtUri: string) => fetch(currentTxtUri)
    .then((response) => response.text());

  const addButtonsToPresentationToolbar = (tags : LinkTag[]) => {
    if (currentUser?.presenter) {
      const buttons = tags.map((tag) => (
        new PresentationToolbarButton({
          label: `Play ${tag.title}`,
          tooltip: 'A generic link tag has been detected in this slide, show it to all?',
          style: {},
          onClick: () => {
            deleteEntryUrlToGenericLink([RESET_DATA_CHANNEL]);
            pushEntryUrlToGenericLink({
              url: tag.presenter,
              isUrlSameForRole: tag.presenter === tag.viewer,
              viewerUrl: tag.viewer,
            });
          },
        })
      ));
      pluginApi.setPresentationToolbarItems(buttons);
    }
  };

  const handleFetchPresentationData = (
    currentPres: CurrentPresentation,
  ) => {
    pluginApi.setPresentationToolbarItems([]);
    const currentTxtUri = currentPres?.currentPage?.urlsJson?.text;
    pluginLogger.info('Trying to fetch the slide text in the following URI:', currentTxtUri);
    if (currentTxtUri) {
      requestCurrentPage(currentTxtUri).then((currentPageContent) => {
        const linkTags = parseTags(currentPageContent);
        addButtonsToPresentationToolbar(linkTags);
      }).catch((err) => {
        pluginLogger.error(`Error while requesting data from bbb-web. Could not get the base text, error: ${err.message}`);
      });
    }
  };

  useEffect(() => {
    const { data: currentPresentation } = currentPresentationResponse;
    if (currentUser?.presenter) handleFetchPresentationData(currentPresentation);
  }, [currentPresentationResponse, currentUser]);

  const handleSendLinkToIframe = (e: React.SyntheticEvent) => {
    e.preventDefault();
    let objectToDispatch: DataToGenericLink;
    if (previousModalState.isUrlSameForRole) {
      const target = e.target as typeof e.target & {
        link: { value: string };
      };
      if (target.link.value.match(REGEX)) {
        objectToDispatch = {
          isUrlSameForRole: true,
          url: target.link.value,
        };
      }
    } else {
      const target = e.target as typeof e.target & {
        link: { value: string };
        viewerLink: { value?: string };
      };
      if (target.link.value.match(REGEX)) {
        objectToDispatch = {
          isUrlSameForRole: false,
          url: target.link.value,
          viewerUrl: target.viewerLink.value,
        };
      }
    }
    if (objectToDispatch) {
      deleteEntryUrlToGenericLink([RESET_DATA_CHANNEL]);
      pushEntryUrlToGenericLink(objectToDispatch);
      setShowModal(false);
    } else {
      setLinkError('Link is malformed, please insert a valid one');
    }
  };

  // Receiving URL data and persisting it to be inserted in the iframe later on
  useEffect(() => {
    if (
      urlToGenericLink.data
      && urlToGenericLink
        .data[urlToGenericLink.data.length - 1]?.payloadJson
    ) {
      setPreviousModalState(urlToGenericLink
        .data[
          urlToGenericLink.data.length - 1]?.payloadJson);
      const isUrlTheSame = urlToGenericLink
        .data[
          urlToGenericLink.data.length - 1
        ]?.payloadJson.isUrlSameForRole;
      if (!isUrlTheSame && !currentUser.presenter) {
        const viewerUrl = urlToGenericLink
          .data[
            urlToGenericLink.data.length - 1
          ]?.payloadJson.viewerUrl;
        if (viewerUrl) {
          setLink(viewerUrl);
          handleChangePresentationAreaContent(true);
        }
      } else {
        setLink(urlToGenericLink
          .data[
            urlToGenericLink.data.length - 1
          ]?.payloadJson.url);
        handleChangePresentationAreaContent(true);
      }
    } else if (
      urlToGenericLink.data
      && !urlToGenericLink
        .data[urlToGenericLink.data.length - 1]?.payloadJson
    ) {
      setLink(null);
      setPreviousModalState({
        isUrlSameForRole: true,
        url: null,
      });
      handleChangePresentationAreaContent(false);
    }
  }, [urlToGenericLink, currentUser]);

  // Set extensible areas (depending o the role of the user)
  useEffect(() => {
    if (currentUser?.presenter) {
      const actionDropdownItemsToRender = [
        new ActionButtonDropdownSeparator(),
      ];
      actionDropdownItemsToRender.push(new ActionButtonDropdownOption({
        label: showingPresentationContent ? 'Trở lại slide BBB' : 'Mở PDF dạng cuộn',
        icon: 'copy',
        tooltip: showingPresentationContent ? 'Đóng trình đọc PDF cho cả lớp'
          : 'Mở tài liệu PDF dạng cuộn cho cả lớp',
        allowed: true,
        onClick: showingPresentationContent ? () => {
          deleteEntryUrlToGenericLink([RESET_DATA_CHANNEL]);
          setShowingPresentationContent(false);
        } : () => {
          if (initialPdfUrl && initialPdfUrl.match(REGEX)) {
            deleteEntryUrlToGenericLink([RESET_DATA_CHANNEL]);
            pushEntryUrlToGenericLink({
              isUrlSameForRole: true,
              url: initialPdfUrl,
            });
          } else {
            setShowModal(true);
          }
        },
      }));
      pluginApi.setActionButtonDropdownItems(actionDropdownItemsToRender);
    } else {
      pluginApi.setActionButtonDropdownItems([]);
    }
  }, [currentUser, showingPresentationContent, initialPdfUrl]);

  useEffect(() => {
    if (link && link !== '') {
      const placeholdersList = mergePlaceholdersList(
        currentUserPlaceholders,
        userMetadata || [],
      );
      pluginApi.setGenericContentItems([]);
      setGenericContentId(pluginApi.setGenericContentItems([
        new GenericContentMainArea({
          contentFunction: (element: HTMLElement) => {
            const root = ReactDOM.createRoot(element);
            root.render(
              <GenericComponentLinkShare
                link={replaceUrlPlaceholders(link, placeholdersList)}
                pluginApi={pluginApi}
                isPresenter={!!currentUser?.presenter}
              />,
            );
            return root;
          },
        }),
      ])[0]);
    } else {
      pluginApi.setGenericContentItems([]);
    }
  }, [link, currentUser?.presenter]);
  return <>
    <ModalToShareLink
      {...{
        setPreviousModalState,
        previousModalState,
        showModal,
        handleCloseModal,
        linkError,
        handleSendLinkToIframe,
        handleCheckboxChange,
        setLinkError,
      }}
    />
    <SynapseQuizRuntime
      pluginApi={pluginApi}
      currentPresentation={currentPresentationResponse.data}
      userMetadata={userMetadata}
    />
  </>;
}

export default GenericLinkShare;
