---
title: 搭建 JupyterLab - PyTorch 开发环境
date: '2020-01-02'
spoiler: 记录搭建过程
tags: Python, PyTorch, DeepLearning
---

最近开始筹备做一个数字病理的项目，需要搭建一个开发环境。DeepLearning项目，肯定是首选Jupyter。两个比较火的深度学习框架Google的TensorFlow和Facebook的PyTorch在一番搜索之下，决定选择PyTorch，原因有以下几点。

1. PyTorch的Api更加的Pythonic。TensorFlow 1.0的发布虽然也让TF的Api更加Pythonic但是也导致了Api接口的巨大变化。这是不喜欢看到的。
2. PyTorch的文档更加清晰易读。
3. 越来越多的公开课的代码从TF转移到了PyTorch上，比如Stanford的CS224n

环境搭建也是几经周折。

## 卸载旧的NVidia和cuda驱动

先要卸载机器上原有的NVidia和Cuda驱动，解决各种版本与PyTorch的不兼容问题

```shell
cd /usr/local/cuda-10.0
./uninstall_cuda_10.0.pl
wget http://us.download.nvidia.com/XFree86/Linux-x86_64/410.48/NVIDIA-Linux-x86_64-410.48.run
sh NVIDIA-Linux-x86_64-410.104.run --uninstall
```

## 下载新的NVidia和cuda驱动

```shell
wget https://developer.nvidia.com/compute/cuda/10.1/Prod/local_installers/cuda_10.1.105_418.39_linux.run
wget http://us.download.nvidia.com/XFree86/Linux-x86_64/440.44/NVIDIA-Linux-x86_64-440.44.run
sh NVIDIA-Linux-x86_64-440.44.run
sh cuda_10.1.105_418.39_linux.run
```

## 新建conda环境

```shell
conda create -n pytorch python=3.7 pip
conda activate pytorch
conda install -c conda-forge jupyterlab
conda install -c pytorch pytorch
conda install pandas pymysql sqlalchemy
conda install fastconda install -c conda-forge jupyter_contrib_nbextensions
conda install -c conda-forge jupyter_contrib_nbextensions
conda install nb_conda
conda install -c fastai fastai
conda install -c anaconda pytorch-gpu
conda install pytorch torchvision cudatoolkit=10.1 -c pytorch
conda install -c anaconda cudatoolkit
conda uninstall -y --force pillow pil jpeg libtiff libjpeg-turbo
pip   uninstall -y         pillow pil jpeg libtiff libjpeg-turbo
conda install -yc conda-forge libjpeg-turbo
CFLAGS=\"${CFLAGS} -mavx2\" pip install --upgrade --no-cache-dir --force-reinstall --no-binary :all: --compile pillow-simd
conda install -y jpeg libtiff
conda install -y -c zegami libtiff-libjpeg-turbo
conda install -c conda-forge opencv
```

## 启动JupyterLab

```shell
nohup jupyter-lab --notebook-dir=/home/data --ip=0.0.0.0 --port=8088 --no-browser --allow-root --NotebookApp.token=xxxxxx >/dev/null 2>&1 &
```

[top](/20200102_deploy_jupyterlab_pytorch_enviroment/)
