from rest_framework.routers import DefaultRouter

from .views import AnatomyModelViewSet, BodySystemViewSet, StructureViewSet

router = DefaultRouter()
router.register('systems', BodySystemViewSet, basename='anatomy-system')
router.register('models', AnatomyModelViewSet, basename='anatomy-model')
router.register('structures', StructureViewSet, basename='anatomy-structure')

urlpatterns = router.urls
