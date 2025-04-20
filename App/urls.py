# urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('calculate-cgpa/', views.calculate_cgpa, name='calculate_cgpa'),
    path('download-sample/', views.download_sample_csv, name='download_sample'),
]