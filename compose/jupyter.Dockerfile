FROM jupyter/base-notebook

USER root

RUN apt-get update -y
RUN apt-get dist-upgrade -y
RUN conda update -y conda
RUN conda install nb_conda_kernels

# RUN add-apt-repository ppa:igraph/ppa
RUN apt-get update -y
RUN apt-get install -y \
    curl \
    python-igraph

COPY ./compose/jupyter-start.sh /usr/local/bin/jupyter-graphistry-start.sh

CMD ["jupyter-graphistry-start.sh"]

